const Asynchandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("ASYNC HANDLER ERROR:", error);

   
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export { Asynchandler };
