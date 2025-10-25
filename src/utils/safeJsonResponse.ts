import { Response } from 'express';

export function safeJsonResponse(res: Response, data: any, statusCode = 200) {
  const replacer = (_key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value;

  const json = JSON.stringify(data, replacer);

  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json');
  res.send(json);
}
