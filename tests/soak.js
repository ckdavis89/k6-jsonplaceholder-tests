import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  JSON_HEADERS,
  randomPostId,
  postPayload,
  summaryHandler,
} from '../utils/helpers.js';

export const handleSummary = summaryHandler('soak');

const errorRate = new Rate('errors');
const responseTrend = new Trend('response_trend');

export const options = {
  stages: [
    { duration: '5m',  target: 20 },
    { duration: '30m', target: 20 },
    { duration: '5m',  target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
    response_trend: ['p(95)<500'],
  },
};

export default function () {
  group('Soak - Read', () => {
    const postId = randomPostId();

    let res = http.get(`${BASE_URL}/posts/${postId}`);
    responseTrend.add(res.timings.duration);
    errorRate.add(!check(res, {
      'GET /posts/:id - status 200': (r) => r.status === 200,
    }));
    sleep(1);

    res = http.get(`${BASE_URL}/posts`);
    responseTrend.add(res.timings.duration);
    errorRate.add(!check(res, {
      'GET /posts - status 200': (r) => r.status === 200,
    }));
    sleep(1);
  });

  group('Soak - Write', () => {
    const res = http.post(`${BASE_URL}/posts`, postPayload(), { headers: JSON_HEADERS });
    responseTrend.add(res.timings.duration);
    errorRate.add(!check(res, {
      'POST /posts - status 201': (r) => r.status === 201,
    }));
    sleep(1);
  });
}