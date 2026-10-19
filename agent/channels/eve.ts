import { eveChannel } from "eve/channels/eve";
import { ForbiddenError, type AuthFn } from "eve/channels/auth";
import { authorized, aiEnabled } from '../lib/policy';

const ownerAuth: AuthFn<Request> = request => {
  if(!authorized(request,process.env.OPS_ADMIN_TOKEN)) return null;
  if(!aiEnabled()) throw new ForbiddenError({message:'Paid AI execution is disabled by the owner.'});
  return {authenticator:'owner-token',principalId:'operator',principalType:'user',attributes:{}};
};

export default eveChannel({
  auth: [ownerAuth],
});
