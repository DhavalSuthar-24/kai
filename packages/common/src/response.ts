export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

export const successResponse = <T>(data: T, message = 'Success'): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

export const errorResponse = (message: string, error?: any): ApiResponse<null> => {
  return {
    success: false,
    message,
    error,
  };
};
