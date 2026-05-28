import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  JSON_HEADERS,
  randomPostId,
  randomUserId,
  postPayload,
  summaryHandler,
} from '../utils/helpers.js';

export const handleSummary = summaryHandler('stress');

const errorRate = new Rate('errors');
const postListTrend = new Trend('post_list_duration');
const postCreateTrend = new Trend('post_create_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '2m', target: 40 },
    { duration: '2m', target: 60 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'],
    errors: ['rate<0.05'],
    post_list_duration: ['p(95)<800'],
    post_create_duration: ['p(95)<1000'],
  },
};

export default function () {
  group('Read-heavy scenario', () => {
    let res = http.get(`${BASE_URL}/posts`);
    postListTrend.add(res.timings.duration);
    errorRate.add(!check(res, {
      'GET /posts - status 200': (r) => r.status === 200,
      'GET /posts - response time OK': (r) => r.timings.duration < 800,
    }));
    sleep(0.5);

    const postId = randomPostId();
    res = http.get(`${BASE_URL}/posts/${postId}`);
    errorRate.add(!check(res, {
      'GET /posts/:id - status 200': (r) => r.status === 200,
    }));
    sleep(0.5);

    const userId = randomUserId();
    res = http.get(`${BASE_URL}/users/${userId}`);
    errorRate.add(!check(res, {
      'GET /users/:id - status 200': (r) => r.status === 200,
    }));
    sleep(0.5);
  });

  group('Write scenario', () => {
    let res = http.post(`${BASE_URL}/posts`, postPayload(), { headers: JSON_HEADERS });
    postCreateTrend.add(res.timings.duration);
    errorRate.add(!check(res, {
      'POST /posts - status 201': (r) => r.status === 201,
      'POST /posts - response time OK': (r) => r.timings.duration < 1000,
    }));
    sleep(0.5);

    const postId = randomPostId();
    res = http.del(`${BASE_URL}/posts/${postId}`);
    errorRate.add(!check(res, {
      'DELETE /posts/:id - status 200': (r) => r.status === 200,
    }));
    sleep(0.5);
  });
}
