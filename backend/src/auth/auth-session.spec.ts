import { AuthController } from './auth.controller';
import { GoogleLoginGuard } from './google-login.guard';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie';
import { UserService } from '../user/user.service';

describe('login and logout session behavior', () => {
  const controller = new AuthController({} as UserService);

  function response() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn(), clearCookie: jest.fn() };
  }

  it('always requests the Google account picker', () => {
    expect(new GoogleLoginGuard().getAuthenticateOptions()).toEqual({ prompt: 'select_account' });
  });

  it('destroys the server session and expires the matching browser cookie', () => {
    const req = {
      logout: jest.fn(callback => callback(null)),
      session: { destroy: jest.fn(callback => callback(null)) },
    };
    const res = response();
    controller.logout(req, res);
    expect(req.logout).toHaveBeenCalledTimes(1);
    expect(req.session.destroy).toHaveBeenCalledTimes(1);
    expect(res.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, sessionCookieOptions());
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'ออกจากระบบสำเร็จ' });
  });

  it('does not report success when session destruction fails', () => {
    const res = response();
    controller.logout({
      logout: callback => callback(null),
      session: { destroy: callback => callback(new Error('store unavailable')) },
    }, res);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
  });

  it('does not report success when Passport logout fails', () => {
    const res = response();
    controller.logout({ logout: callback => callback(new Error('logout failed')) }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
  });

  it('does not return identity for an anonymous request', () => {
    expect(controller.getMe({})).toEqual({ authenticated: false });
  });
});
