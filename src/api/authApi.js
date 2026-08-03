import { USER_SERVICE_BASE_URL } from '../utils/constants';
import { getConfiguredServiceBase } from '../utils/serviceConfig';
import { readServiceResponse } from './response';

export async function loginUser({ email, password }) {
  const loginURL = new URL(getConfiguredServiceBase(USER_SERVICE_BASE_URL, 'User service base URL'));
  loginURL.pathname = `${loginURL.pathname.replace(/\/+$/, '')}/users/login`;
  const res = await fetch(loginURL.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await readServiceResponse(res, 'User service');

  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Login failed");
  }

  return data.data;
}
