import AppError from "./appErrors";

export default class RequestValidationError extends AppError {
    public errors: Record<string, string>;
    constructor(errors: Record<string, string>, statusCode = 400) {
        super(statusCode, "তথ্যগুলো সঠিকভাবে পূরণ করুন।");
        this.errors = errors;
    }
}
