import {defineChannel,GET} from 'eve/channels';
import {handle} from '../lib/http';
export default defineChannel({routes:[GET('/',request=>handle(request))]});
