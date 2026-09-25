import {
  cafeFilterSchema,
  cafeMapFilterSchema,
  categoryFilterSchema,
  friendsListResultSchema,
  gameFilterSchema,
  meetupCalendarDaySchema,
  meetupCalendarQuerySchema,
  meetupDetailDtoSchema,
  meetupFilterSchema,
  meetupListResponseSchema,
  publicProfileSchema,
} from '@onboard/shared';
import { z, type ZodObject } from 'zod';
import {
  apiErrorBodySchema,
  cafeForGameDtoSchema,
  cafeListResponseSchema,
  cafeMapPinDtoSchema,
  cafePublicDetailDtoSchema,
  categoryDtoSchema,
  gameDetailDtoSchema,
  gameListResponseSchema,
  provinceListResponseSchema,
  shelfListResultDtoSchema,
  wardListResponseSchema,
} from './dto-schemas.js';

const JSON_SCHEMA_OPTS = { target: 'openapi-3.0' } as const;

function componentSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { ...JSON_SCHEMA_OPTS, io: 'output' });
}

/** Turns a flat zod query-string object schema into OpenAPI `in: query` parameter entries. */
function queryParams(schema: ZodObject) {
  const jsonSchema = z.toJSONSchema(schema, { ...JSON_SCHEMA_OPTS, io: 'input' }) as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  const required = new Set(jsonSchema.required ?? []);
  return Object.entries(jsonSchema.properties ?? {}).map(([name, propSchema]) => ({
    name,
    in: 'query',
    required: required.has(name),
    schema: propSchema,
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiErrorBody' } } },
});

const NOT_FOUND = errorResponse('Không tìm thấy');
const RATE_LIMITED = errorResponse('Quá nhiều yêu cầu');

function jsonResponse(description: string, schema: z.ZodType) {
  return {
    description,
    content: { 'application/json': { schema: componentSchema(schema) } },
  };
}

/**
 * Hand-assembled OpenAPI 3.0 document for the public **read-only** routes (no auth required).
 * Component response schemas are generated from the shared/local zod schemas via `z.toJSONSchema`;
 * routes are not rewritten to `@hono/zod-openapi` to keep this additive to the existing Hono app.
 */
/** Broad return type on purpose: keeps zod's internal JSON Schema types out of the Hono RPC type. */
export function buildOpenApiDocument(siteUrl: string): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'OnBoardVN API',
      version: '1.0.0',
      description:
        'API công khai (chỉ đọc) cho danh bạ quán board game và kho game OnBoardVN. ' +
        'Dữ liệu mở giấy phép CC0/CC BY-SA 4.0 — xem /developers.',
      license: { name: 'AGPL-3.0-only', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
    },
    servers: [{ url: `${siteUrl}/api` }],
    paths: {
      '/games': {
        get: {
          summary: 'Danh sách game',
          parameters: queryParams(gameFilterSchema),
          responses: {
            '200': jsonResponse('Danh sách game', gameListResponseSchema),
            '422': errorResponse('Tham số không hợp lệ'),
            '429': RATE_LIMITED,
          },
        },
      },
      '/games/{slug}': {
        get: {
          summary: 'Chi tiết game',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonResponse('Chi tiết game', gameDetailDtoSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/games/{slug}/cafes': {
        get: {
          summary: 'Danh sách quán có game này',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonResponse('Danh sách quán', z.array(cafeForGameDtoSchema)),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/categories': {
        get: {
          summary: 'Danh sách thể loại/cơ chế',
          parameters: queryParams(categoryFilterSchema),
          responses: {
            '200': jsonResponse(
              'Danh sách thể loại',
              z.object({ items: z.array(categoryDtoSchema) }),
            ),
            '429': RATE_LIMITED,
          },
        },
      },
      '/locations/provinces': {
        get: {
          summary: 'Danh sách tỉnh/thành',
          responses: {
            '200': jsonResponse('Danh sách tỉnh/thành', provinceListResponseSchema),
            '429': RATE_LIMITED,
          },
        },
      },
      '/locations/provinces/{code}/wards': {
        get: {
          summary: 'Danh sách phường/xã theo tỉnh/thành',
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonResponse('Danh sách phường/xã', wardListResponseSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/cafes': {
        get: {
          summary: 'Danh sách quán có game',
          parameters: queryParams(cafeFilterSchema),
          responses: {
            '200': jsonResponse('Danh sách quán', cafeListResponseSchema),
            '422': errorResponse('Tham số không hợp lệ'),
            '429': RATE_LIMITED,
          },
        },
      },
      '/cafes/map': {
        get: {
          summary: 'Ghim quán trên bản đồ',
          parameters: queryParams(cafeMapFilterSchema),
          responses: {
            '200': jsonResponse('Danh sách ghim quán', z.array(cafeMapPinDtoSchema)),
            '422': errorResponse('Tham số không hợp lệ'),
            '429': RATE_LIMITED,
          },
        },
      },
      '/cafes/{slug}': {
        get: {
          summary: 'Chi tiết quán',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonResponse('Chi tiết quán', cafePublicDetailDtoSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/events': {
        get: {
          summary: 'Danh sách Kèo công khai sắp tới',
          parameters: queryParams(meetupFilterSchema),
          responses: {
            '200': jsonResponse('Danh sách Kèo', meetupListResponseSchema),
            '422': errorResponse('Tham số không hợp lệ'),
            '429': RATE_LIMITED,
          },
        },
      },
      '/events/calendar': {
        get: {
          summary: 'Lịch Kèo theo tháng (giờ Asia/Saigon)',
          parameters: queryParams(meetupCalendarQuerySchema),
          responses: {
            '200': jsonResponse('Thống kê theo ngày', z.array(meetupCalendarDaySchema)),
            '422': errorResponse('Tham số không hợp lệ'),
            '429': RATE_LIMITED,
          },
        },
      },
      '/events/{slug}': {
        get: {
          summary: 'Chi tiết Kèo (`?code=` để xem Kèo riêng tư có link mời)',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'code', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: {
            '200': jsonResponse('Chi tiết Kèo', meetupDetailDtoSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/users/{username}': {
        get: {
          summary: 'Hồ sơ công khai (không có email)',
          parameters: [
            { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': jsonResponse('Hồ sơ công khai', publicProfileSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/users/{username}/friends': {
        get: {
          summary: 'Danh sách bạn bè (theo cài đặt riêng tư của người dùng đó)',
          parameters: [
            { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': jsonResponse('Danh sách bạn bè hoặc { hidden: true }', friendsListResultSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
      '/users/{username}/shelf': {
        get: {
          summary: 'Tủ game (theo cài đặt riêng tư của người dùng đó)',
          parameters: [
            { name: 'username', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': jsonResponse('Tủ game hoặc { hidden: true }', shelfListResultDtoSchema),
            '404': NOT_FOUND,
            '429': RATE_LIMITED,
          },
        },
      },
    },
    components: {
      schemas: {
        ApiErrorBody: componentSchema(apiErrorBodySchema),
      },
    },
  };
}
