const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
test('background starts off; muting music leaves effects working, and ambient audio mixing is requested',async()=>{
 let started=0,media=0,contexts=0
 const gain=()=>({gain:{value:0,setTargetAtTime(){},cancelScheduledValues(){}},connect(){}})
 class AudioContext{constructor(){contexts++;this.currentTime=0}resume(){return Promise.resolve()}suspend(){return Promise.resolve()}createGain(){return gain()}createBufferSource(){return {connect(){},start(){started++},stop(){}}}decodeAudioData(){return Promise.resolve({getChannelData:()=>new Float32Array([0.5]),sampleRate:44100})}createMediaElementSource(){return {connect(){}}}}
 class Audio{constructor(){media++;this.paused=true}addEventListener(){}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
 const win={AudioContext,setTimeout:()=>0,addEventListener(){}},doc={addEventListener(){}},nav={audioSession:{type:'auto'}}
 const mod={exports:{}}
 new Function('exports','module','window','document','navigator','Audio','fetch',ts.transpileModule(fs.readFileSync('lib/sound.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod,win,doc,nav,Audio,async()=>({arrayBuffer:async()=>new ArrayBuffer(1)}))
 const sound=mod.exports
 assert.equal(sound.getState().muted,true);assert.equal(media,0);assert.equal(contexts,0)
 sound.unlock();assert.equal(contexts,0)
 await sound.play('ding');assert.equal(started,1);assert.equal(sound.getState().muted,true);assert.equal(media,0);assert.equal(nav.audioSession.type,'ambient')
 sound.setEffectsMuted(true);await sound.play('ding');assert.equal(started,1)
 sound.setEffectsMuted(false);await sound.play('dingdong');assert.equal(started,2)
 sound.setMuted(false);assert(media>0);assert.equal(sound.getState().effectsMuted,false)
})
