const Asynchandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    let statusCode = error.statusCode || error.statuscode || 500;
    if (error.name === "ValidationError") statusCode = 400;
    if (statusCode >= 500) {
      console.error("ASYNC HANDLER ERROR:", error);
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export { Asynchandler };
