import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, JSON_HEADERS, postPayload, summaryHandler } from '../utils/helpers.js';

export const handleSummary = summaryHandler('smoke');

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  group('Smoke - Posts', () => {
    let res = http.get(`${BASE_URL}/posts`);
    check(res, {
      'GET /posts - status 200': (r) => r.status === 200,
      'GET /posts - returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });
    sleep(1);

    res = http.post(`${BASE_URL}/posts`, postPayload(), { headers: JSON_HEADERS });
    check(res, {
      'POST /posts - status 201': (r) => r.status === 201,
      'POST /posts - returns id': (r) => JSON.parse(r.body).id !== undefined,
    });
    sleep(1);
  });

  group('Smoke - Users', () => {
    const res = http.get(`${BASE_URL}/users/1`);
    check(res, {
      'GET /users/1 - status 200': (r) => r.status === 200,
      'GET /users/1 - has email': (r) => JSON.parse(r.body).email !== undefined,
    });
    sleep(1);
  });
}