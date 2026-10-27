import { calculateDesign } from './design.mjs';
import { mapPixelsPerMetre } from './map.mjs';
import { signFaceForLabel, validDrawing } from './drawing.mjs';

export function roadProjector(path, start, direction, map) {
 if (!Array.isArray(path) || path.length < 2 || path.length > 80 || path.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0)||p[0]>1000||p[1]>650)) throw Error('AI did not return a usable road trace. Try a clearer map view.');
 const ppm=mapPixelsPerMetre(map), distances=[0];
 for(let i=1;i<path.length;i++) {const length=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);if(length<1)throw Error('AI road trace contains duplicate points.');distances.push(distances.at(-1)+length);}
 let nearest=null;
 for(let i=1;i<path.length;i++) {const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],length=distances[i]-distances[i-1];const t=Math.max(0,Math.min(1,((start[0]-a[0])*dx+(start[1]-a[1])*dy)/(length*length)));const p=[a[0]+t*dx,a[1]+t*dy],error=Math.hypot(p[0]-start[0],p[1]-start[1]);if(!nearest||error<nearest.error)nearest={error,chain:distances[i-1]+t*length,dx:dx/length,dy:dy/length};}
 if(nearest.error>Math.min(12,ppm*8))throw Error('The AI trace does not pass through the marked work start. Mark the correct carriageway more clearly.');
 const dot=nearest.dx*direction[0]+nearest.dy*direction[1];
 if(dot<=0)throw Error('The AI road trace conflicts with the marked direction. Check the start and direction marks.');
 const point=(chain,lateral=0)=>{const distance=nearest.chain+chain*ppm;if(distance<0||distance>distances.at(-1))throw Error('The approach or departure extends outside the traced map. Zoom out to include the full signing area and mark the start again.');let i=1;while(i<distances.length-1&&distance>distances[i])i++;const a=path[i-1],b=path[i],length=distances[i]-distances[i-1],t=(distance-distances[i-1])/length,ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;return [a[0]+t*(b[0]-a[0])+uy*lateral*ppm,a[1]+t*(b[1]-a[1])-ux*lateral*ppm];};
 return {point,length:distances.at(-1)/ppm};
}
export function buildAiMapDraft(input, analysis, map, alignment) {
 const direction=[alignment[1][0]-alignment[0][0],alignment[1][1]-alignment[0][1]];
 const {point:project}=roadProjector(analysis.path,alignment[0],direction,map),side=input.worksSide==='near'?1:-1;
 const point=(chain,lateral)=>project(chain,lateral*side);
 const design=calculateDesign({...input,scopeConfirmed:true,worksStart:0});
 const items=[];
 const add=(type,p,q=p,text='',scale=1,extra={})=>items.push({type,x:p[0],y:p[1],x2:q[0],y2:q[1],text,scale,...extra});
 for(const cone of design.cones)add('cone',point(cone.x,input.roadWidth/2-cone.y),undefined,'',0.65);
 // Split the working strip so it follows the traced road rather than its chord.
 const pieces=Math.min(40,Math.max(1,Math.ceil(input.worksLength/10)));
 for(let i=0;i<pieces;i++){const a=i*input.worksLength/pieces,b=(i+1)*input.worksLength/pieces,p=point(a,input.roadWidth/2),q=point(b,input.roadWidth/2-input.workWidth);add('works',p,q,i===0?'WORKS':'',1,{points:[p,point(b,input.roadWidth/2),q,point(a,input.roadWidth/2-input.workWidth)]});}
 for(const barrier of design.barriers)add('barrier',point(barrier.x,input.roadWidth/2),point(barrier.x,input.roadWidth/2-input.workWidth));
 for(const sign of design.signs){const opposing=['Approach B','Approach B exit','Offside'].includes(sign.side);add('sign',point(sign.chainage,(opposing?-1:1)*(input.roadWidth/2+8)),undefined,sign.id,0.85,{signFace:signFaceForLabel(sign.label)});}
 if(input.roadType==='single'){add('lights',point(design.taperEnd,input.roadWidth/2+4));add('lights',point(design.returnStart,-input.roadWidth/2-4));}
 add('label',point(0,0),undefined,'WORK START',0.7);
 add('label',point(input.worksLength,0),undefined,'WORK END',0.7);
 if(input.accessAt!==null)add('label',point(input.accessAt,input.roadWidth/2),undefined,'PROPOSED WORKS ACCESS — review gap / vehicle route',0.7);
 if(!validDrawing(items))throw Error('Drawing is too large or invalid. Reduce the work length or split it into reviewed sections.');
 if(items.some(i=>[i.x,i.x2].some(n=>n<30||n>970)||[i.y,i.y2].some(n=>n<35||n>565)||i.points?.some(p=>p[0]<30||p[0]>970||p[1]<35||p[1]>565)))throw Error('The complete draft extends outside this map view. Zoom out or re-centre, then mark the start and direction again. No signs have been clipped or moved to fit.');
 return {items,design};
}
