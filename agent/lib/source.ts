import { projectById } from './catalog';
export async function readSource(projectId:string,path:string,fetcher:typeof fetch=fetch) {
 const p=projectById(projectId);
 if(!p.repository) throw new Error('No repository registered');
 if(!/^[a-zA-Z0-9_./-]{1,180}$/.test(path)||path.split('/').some(x=>!x||(x.startsWith('.')&&x!=='.github')||['node_modules','dist','data','credentials','secrets'].includes(x))||/secret|credential|token|\.pem$|\.key$|lock\.json$/i.test(path)) throw new Error('Source path is not allowed');
 if(!/\.(tsx?|jsx?|py|md|json|ya?ml|css|html|sql)$/.test(path)) throw new Error('Unsupported source file');
 const response=await fetcher('https://api.github.com/repos/'+p.repository+'/contents/'+path.split('/').map(encodeURIComponent).join('/'),{headers:{Accept:'application/vnd.github+json','User-Agent':'CommandDeckCloud/1.0',...(process.env.PROJECT_GITHUB_READ_TOKEN?{Authorization:'Bearer '+process.env.PROJECT_GITHUB_READ_TOKEN}:{})},signal:AbortSignal.timeout(10000)});
 if(!response.ok) throw new Error('Repository source unavailable');
 const result=await response.json() as {size:number;content:string;encoding:string;sha:string};
 if(result.size>64000||result.encoding!=='base64') throw new Error('Source file is too large or unsupported');
 // Source is explicitly untrusted; never echo it into operational reports automatically.
 return {projectId,path,sha:result.sha,untrusted:true,content:Buffer.from(result.content,'base64').toString('utf8')};
}
