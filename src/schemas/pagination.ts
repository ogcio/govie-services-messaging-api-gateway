import { type Static, Type } from "typebox";
import {
  PAGINATION_LIMIT_DEFAULT,
  PAGINATION_MAX_LIMIT,
  PAGINATION_MIN_OFFSET,
} from "../const/pagination.js";

const getPaginationLinkSchema = (description?: string, hrefExample?: string) =>
  Type.Object(
    {
      href: Type.Optional(Type.String({ description })),
    },
    {
      description: "Object containing the URL link",
      examples: [
        {
          href:
            hrefExample ??
            "https://api.example.ie/api/v1/messages?offset=0&limit=20",
        },
      ],
    },
  );

export const PaginationParamsSchema = Type.Object(
  {
    offset: Type.Optional(
      Type.String({
        pattern: "^[0-9][0-9]*|undefined$",
        default: PAGINATION_MIN_OFFSET.toString(),
        description:
          "Indicates where to start fetching data or how many records to skip, defining the initial position within the list",
      }),
    ),
    limit: Type.Optional(
      Type.String({
        default: PAGINATION_LIMIT_DEFAULT.toString(),
        pattern: `^([1-9]|${PAGINATION_MAX_LIMIT})|undefined$`,
        description: `Indicates the maximum number (${PAGINATION_MAX_LIMIT}) of items that will be returned in a single request`,
      }),
    ),
  },
  { examples: [{ offset: "0", limit: "20" }] },
);

export type PaginationParams = Static<typeof PaginationParamsSchema>;

export const PaginationLinksSchema = Type.Object(
  {
    self: getPaginationLinkSchema(
      "URL pointing to the request itself",
      "https://api.example.ie/api/v1/the-endpoint?offset=20&limit=20",
    ),
    next: Type.Optional(
      getPaginationLinkSchema(
        "URL pointing to the next page of results in a paginated response. If there are no more results, this field may be omitted",
        "https://api.example.ie/api/v1/the-endpoint?offset=40&limit=20",
      ),
    ),
    prev: Type.Optional(
      getPaginationLinkSchema(
        "URL pointing to the previous page of results in a paginated response. If there are no more results, this field may be omitted",
        "https://api.example.ie/api/v1/the-endpoint?offset=0&limit=20",
      ),
    ),
    first: getPaginationLinkSchema(
      "URL pointing to the first page of results in a paginated response",
      "https://api.example.ie/api/v1/the-endpoint?offset=0&limit=20",
    ),
    last: getPaginationLinkSchema(
      "URL pointing to the first page of results in a paginated response",
      "https://api.example.ie/api/v1/the-endpoint?offset=120&limit=20",
    ),
    pages: Type.Record(Type.String(), getPaginationLinkSchema(), {
      examples: [
        {
          page1: {
            href: "https://api.example.ie/api/v1/the-endpoint?offset=0&limit=20",
          },
          page2: {
            href: "https://api.example.ie/api/v1/the-endpoint?offset=20&limit=20",
          },
        },
      ],
      description:
        "It may contain a list of other useful URLs, e.g. one entry for page:'page 1', 'page 2'",
    }),
  },
  { description: "Object containing the links to the related endpoints" },
);

export type PaginationLinks = Static<typeof PaginationLinksSchema>;

// PaginatedResponseSchema removed in favor of GenericResponse pattern (data + optional metadata)
