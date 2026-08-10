(()=>{
  const nativeFetch=window.fetch.bind(window);
  const TARGET='/functions/v1/eidos-archive';

  function bodyOf(init){
    if(!init||typeof init.body!=='string')return null;
    try{return JSON.parse(init.body)}catch{return null}
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=String(init?.method||(input&&input.method)||'GET').toUpperCase();
    const body=bodyOf(init);

    if(!url.includes(TARGET)||method!=='POST'||body?.action!=='submit'){
      return nativeFetch(input,init);
    }

    const response=await nativeFetch(input,init);
    if(response.status!==409)return response;

    let errorBody=null;
    try{errorBody=await response.clone().json()}catch{}
    if(errorBody?.error!=='expired_challenge')return response;

    try{
      const challengeResponse=await nativeFetch(url,{
        method:'POST',
        headers:init?.headers,
        body:JSON.stringify({action:'challenge'}),
        signal:init?.signal
      });
      if(!challengeResponse.ok)return response;
      const challengeBody=await challengeResponse.json();
      if(!challengeBody?.challenge)return response;
      body.challenge=challengeBody.challenge;
      return nativeFetch(input,{...init,body:JSON.stringify(body)});
    }catch{
      return response;
    }
  };
})();
