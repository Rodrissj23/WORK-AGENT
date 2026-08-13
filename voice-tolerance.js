// Work Agent voice tolerance hotfix v1
// Wake word por similitud + correcciones comunes de Whisper.

function waLev(a,b){
  a=String(a||'');b=String(b||'');
  const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    dp[i][j]=Math.min(
      dp[i-1][j]+1,
      dp[i][j-1]+1,
      dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)
    );
  }
  return dp[m][n];
}

function waNormalizeToken(v){
  return String(v||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

function waWakeTokenMatches(token){
  const got=waNormalizeToken(token);
  const target=waNormalizeToken(WA_LOCAL_VOICE?.wakeWord||'jarvis');
  if(!got||!target)return false;
  if(got===target)return true;
  const maxDist=target.length>=6?2:1;
  return Math.abs(got.length-target.length)<=2 && waLev(got,target)<=maxDist;
}

function waFixSttCommand(text){
  let q=String(text||'').trim();
  q=q
    .replace(/\bmiliquiaci[oó]n\b/gi,'mi liquidación')
    .replace(/\bmiliquidaci[oó]n\b/gi,'mi liquidación')
    .replace(/\bmi liquiaci[oó]n\b/gi,'mi liquidación')
    .replace(/\bliquiaci[oó]n\b/gi,'liquidación')
    .replace(/\bliquidasion\b/gi,'liquidación');
  return q;
}

// Reemplaza la detección rígida del wake word.
waStripWake=function(text){
  const original=String(text||'').trim();
  const parts=original.split(/\s+/);
  if(!parts.length)return null;

  // Whisper suele colocar el wake word como primera palabra.
  if(waWakeTokenMatches(parts[0])){
    return waFixSttCommand(parts.slice(1).join(' ').replace(/^[,:;.!?\s-]+/,'').trim());
  }

  // También toleramos una palabra introductoria corta antes del wake word.
  if(parts.length>1 && /^(hey|oye|che)$/i.test(waNormalizeToken(parts[0])) && waWakeTokenMatches(parts[1])){
    return waFixSttCommand(parts.slice(2).join(' ').replace(/^[,:;.!?\s-]+/,'').trim());
  }
  return null;
};

const waHandleHandsFreeTextBeforeTolerance=waHandleHandsFreeText;
waHandleHandsFreeText=async function(text){
  const fixed=waFixSttCommand(text);
  return waHandleHandsFreeTextBeforeTolerance(fixed);
};

const waLooksLikeExecutableCommandBeforeTolerance=waLooksLikeExecutableCommand;
waLooksLikeExecutableCommand=function(text){
  return waLooksLikeExecutableCommandBeforeTolerance(waFixSttCommand(text));
};

window.WA_VOICE_TOLERANCE={
  version:'1.0',
  distance:waLev,
  wakeMatches:waWakeTokenMatches,
  fixCommand:waFixSttCommand
};
