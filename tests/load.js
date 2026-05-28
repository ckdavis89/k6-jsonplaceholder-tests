import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import {
  BASE_URL,
  JSON_HEADERS,
  randomPostId,
  randomUserId,
  postPayload,
  putPayload,
  summaryHandler,
} from '../utils/helpers.js';

export const handleSummary = summaryHandler('load');

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    readers: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m',  target: 15 },
        { duration: '30s', target: 0  },
      ],
      exec: 'readScenario',
      gracefulRampDown: '10s',
    },
    writers: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m',  target: 5 },
        { duration: '30s', target: 0 },
      ],
      exec: 'writeScenario',
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

export function readScenario() {
  group('Posts - Read', () => {
    let res = http.get(`${BASE_URL}/posts`);
    errorRate.add(!check(res, {
      'GET /posts - status 200': (r) => r.status === 200,
      'GET /posts - returns array': (r) => Array.isArray(JSON.parse(r.body)),
    }));
    sleep(1);

    const postId = randomPostId();
    res = http.get(`${BASE_URL}/posts/${postId}`);
    errorRate.add(!check(res, {
      'GET /posts/:id - status 200': (r) => r.status === 200,
      'GET /posts/:id - correct id': (r) => JSON.parse(r.body).id === postId,
    }));
    sleep(1);

    res = http.get(`${BASE_URL}/posts/${postId}/comments`);
    errorRate.add(!check(res, {
      'GET /posts/:id/comments - status 200': (r) => r.status === 200,
      'GET /posts/:id/comments - returns array': (r) => Array.isArray(JSON.parse(r.body)),
    }));
    sleep(1);
  });

  group('Users - Read', () => {
    const userId = randomUserId();

    let res = http.get(`${BASE_URL}/users/${userId}`);
    errorRate.add(!check(res, {
      'GET /users/:id - status 200': (r) => r.status === 200,
      'GET /users/:id - has email': (r) => JSON.parse(r.body).email !== undefined,
    }));
    sleep(1);

    res = http.get(`${BASE_URL}/users/${userId}/posts`);
    errorRate.add(!check(res, {
      'GET /users/:id/posts - status 200': (r) => r.status === 200,
      'GET /users/:id/posts - returns array': (r) => Array.isArray(JSON.parse(r.body)),
    }));
    sleep(1);
  });
}

export function writeScenario() {
  group('Posts - Write', () => {
    let res = http.post(`${BASE_URL}/posts`, postPayload(), { headers: JSON_HEADERS });
    errorRate.add(!check(res, {
      'POST /posts - status 201': (r) => r.status === 201,
      'POST /posts - returns id': (r) => JSON.parse(r.body).id !== undefined,
    }));
    sleep(1);

    const postId = randomPostId();
    res = http.put(`${BASE_URL}/posts/${postId}`, putPayload(postId), { headers: JSON_HEADERS });
    errorRate.add(!check(res, {
      'PUT /posts/:id - status 200': (r) => r.status === 200,
      'PUT /posts/:id - correct id': (r) => JSON.parse(r.body).id === postId,
    }));
    sleep(1);

    res = http.patch(
      `${BASE_URL}/posts/${postId}`,
      JSON.stringify({ title: 'Patched title' }),
      { headers: JSON_HEADERS }
    );
    errorRate.add(!check(res, {
      'PATCH /posts/:id - status 200': (r) => r.status === 200,
      'PATCH /posts/:id - title updated': (r) => JSON.parse(r.body).title === 'Patched title',
    }));
    sleep(1);

    res = http.del(`${BASE_URL}/posts/${postId}`);
    errorRate.add(!check(res, {
      'DELETE /posts/:id - status 200': (r) => r.status === 200,
    }));
    sleep(1);
  });
}
