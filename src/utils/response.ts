
type ResponseError = {
  success: boolean;
  data?: any;
  message?: string;
  error?: string | null;
}

const ResponseUtils = {
  INTERNAL_SERVER_ERROR: (message: string): ResponseError => ({
    success: false,
    data: null,
    message: "Internal Server Error",
    error: message,
  }),

  BAD_REQUEST: (message: string): ResponseError => ({
    success: false,
    data: null,
    message: "Bad Request",
    error: message,
  }),

  UNAUTHORIZED: (message: string): ResponseError => ({
    success: false,
    data: null,
    message: "Unauthorized",
    error: message,
  }),

  FORBIDDEN: (message: string): ResponseError => ({
    success: false,
    data: null,
    message: "Forbidden",
    error: message,
  }),

  NOT_FOUND: (message: string): ResponseError => ({
    success: false,
    data: null,
    message: "Not Found",
    error: message,
  }),

  SUCCESS: (data: any, message: string = "Request was successful"): ResponseError => ({
    success: true,
    data,
    message: message,
    error: undefined,
  }),
}

export const {
  INTERNAL_SERVER_ERROR,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  SUCCESS,
  NOT_FOUND,
} = ResponseUtils;