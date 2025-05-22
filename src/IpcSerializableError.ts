// IpcSerializableError.ts

export class IpcSerializableError extends Error {
  // Optionally include additional fields as needed
  constructor(message: string, public code?: string, public data?: any) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Serialize for IPC
  static serialize(err: Error) {
    const plain = {
      __ipcError: true,
      name: err.name,
      message: err.message,
      stack: err.stack,
      // If extra fields exist, include them (optional)
      ...(err as any).code && { code: (err as any).code },
      ...(err as any).data && { data: (err as any).data },
    };
    return plain;
  }

  // Deserialize in renderer
  static deserialize(obj: any): IpcSerializableError | Error {
    if (!obj || !obj.__ipcError) return obj;
    const error = new IpcSerializableError(obj.message, obj.code, obj.data);
    error.name = obj.name;
    error.stack = obj.stack;
    return error;
  }
}
