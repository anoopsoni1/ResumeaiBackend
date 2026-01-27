class ApiError extends Error {
    constructor(
        statuscode , message = "something went wrong" ,
        error = [] ,
    ){
        super(message)
        this.statuscode = statuscode ,
        this.data = null , 
        this.message = message ,
        this.success = false ,
        this.error = error
    }
}

export {ApiError}