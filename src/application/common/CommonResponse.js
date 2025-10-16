class CommonResponse {
    static success(res, data = {}, message = "Success", statusCode = 200) {
      res.status(statusCode).json({
        success: true,
        message,
        data,
      });
    }
  
    static error(res, error = "An error occurred", statusCode = 500) {
      const isProduction = process.env.NODE_ENV === "production";
  
      res.status(statusCode).json({
        success: false,
        message: error.message || error,
        error: isProduction ? null : error.stack,
      });
    }
  }
  
  export default CommonResponse;
  