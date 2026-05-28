import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, randomPostId, randomUserId, summaryHandler } from '../utils/helpers.js';

export const handleSummary = summaryHandler('spike');

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.10'],
  },
};

export default function () {
  group('Spike - Posts', () => {
    const postId = randomPostId();
    let res = http.get(`${BASE_URL}/posts/${postId}`);
    errorRate.add(!check(res, {
      'GET /posts/:id - status 200': (r) => r.status === 200,
      'GET /posts/:id - responded within 2s': (r) => r.timings.duration < 2000,
    }));
    sleep(0.2);

    res = http.get(`${BASE_URL}/posts`);
    errorRate.add(!check(res, {
      'GET /posts - status 200': (r) => r.status === 200,
      'GET /posts - responded within 2s': (r) => r.timings.duration < 2000,
    }));
    sleep(0.2);
  });

  group('Spike - Users', () => {
    const userId = randomUserId();
    const res = http.get(`${BASE_URL}/users/${userId}`);
    errorRate.add(!check(res, {
      'GET /users/:id - status 200': (r) => r.status === 200,
      'GET /users/:id - responded within 2s': (r) => r.timings.duration < 2000,
    }));
    sleep(0.2);
  });
}
