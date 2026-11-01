import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis,"document",{value:dom.window.document,configurable:true});
Object.defineProperty(globalThis,"window",{value:dom.window,configurable:true});
const s={canvas:null,createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},arc(){},ellipse(){},closePath(){},fill(){},stroke(){},moveTo(){},lineTo(){},quadraticCurveTo(){},bezierCurveTo(){},save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(){},putImageData(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),setTransform(){},clearRect(){},fillText(){},strokeText(){},measureText:()=>({width:1})};
const orig=dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.getContext=function(t){if(t==="2d")return{...s,canvas:this};return orig.call(this,t);};
const THREE=await import("three");
const tuning=await import("/home/user/CAT-PARTY/src/game/tuning.ts");
tuning.setShapeMode("asset");
const cm=await import("/home/user/CAT-PARTY/src/game/characterMesh.ts");
const {animalById}=await import("/home/user/CAT-PARTY/src/game/animals.ts");
const v=cm.buildCharacterVisual(animalById("oyen"),"none","default","default");
const root=new THREE.Group();root.add(...v.all);root.updateMatrixWorld(true);
v.mesh.skeleton.update();
const pos=v.mesh.geometry.attributes.position,col=v.mesh.geometry.attributes.color;
// crease colour
const white=new THREE.Color(0xf8f3ec);
const target=new THREE.Color(white).multiplyScalar(0.74).lerp(new THREE.Color(0xb8a696),0.55);
let n=0;const ys=[];
for(let i=0;i<pos.count;i++){
  const r=col.getX(i),g=col.getY(i),b=col.getZ(i);
  if(Math.abs(r-target.r)<0.03&&Math.abs(g-target.g)<0.03&&Math.abs(b-target.b)<0.03){
    const p=new THREE.Vector3().fromBufferAttribute(pos,i);v.mesh.applyBoneTransform(i,p);ys.push(p.y);n++;
  }
}
console.log("target",target.r.toFixed(3),target.g.toFixed(3),target.b.toFixed(3),"matches",n);
if(n)console.log("y range",Math.min(...ys).toFixed(3),Math.max(...ys).toFixed(3));
