// Projection inchangée : calcul pur utilisable dans un worker et en secours découpé.
const TAU=Math.PI*2;
const atmosphere={venus:[210,171,103],terre:[58,142,235],mars:[157,86,51],jupiter:[177,153,117],saturne:[202,184,138],uranus:[126,207,217],neptune:[75,126,225]};
function lire(tex,u,v,k){const x=((u%1+1)%1)*(tex.w-1),y=Math.max(0,Math.min(1,v))*(tex.h-1),x0=x|0,y0=y|0,x1=Math.min(tex.w-1,x0+1),y1=Math.min(tex.h-1,y0+1),a=x-x0,b=y-y0,d=tex.data;return (d[(y0*tex.w+x0)*4+k]*(1-a)+d[(y0*tex.w+x1)*4+k]*a)*(1-b)+(d[(y1*tex.w+x0)*4+k]*(1-a)+d[(y1*tex.w+x1)*4+k]*a)*b;}

export async function projeterPlanete({id,taille,phase=0,map,cloud=null,ring=null}, ceder=null){
    const d=new Uint8ClampedArray(taille*taille*4);
    const rings=id==='saturne',r=taille*(rings?.225:.475),cx=taille/2,cy=taille/2;
    const lx=-.57,ly=-.42,lz=.706,rot=-.38,cr=Math.cos(rot),sr=Math.sin(rot),tilt=.34,tiltZ=Math.sqrt(1-tilt*tilt);
    const decalage={terre:.54,mars:.1,jupiter:.52,mercure:.22,venus:.3,saturne:.16,uranus:.18,neptune:.22,lune:.49,soleil:.2}[id]||0;
    for(let y=0;y<taille;y++){
      if (ceder && y % 16 === 0) await ceder();
      for(let x=0;x<taille;x++){
      const nx=(x-cx)/r,ny=(y-cy)/r,rr=nx*nx+ny*ny,i=(y*taille+x)*4;
      let rgb=null,alpha=0,z=-Infinity;
      if(rr<=1){z=Math.sqrt(1-rr);const u=Math.atan2(nx,z)/TAU+decalage+phase*.12,v=.5+Math.asin(ny)/Math.PI;
        const dot=nx*lx+ny*ly+z*lz,light=id==='soleil'?1:.035+.965*Math.max(0,dot);
        rgb=[0,1,2].map(k=>lire(map,u,v,k));
        if(cloud){const a=Math.max(0,(lire(cloud,u+.008,v,0)-24)/231)*.8;rgb=rgb.map(v=>v*(1-a)+239*a);}
        rgb=rgb.map(v=>v*light);alpha=Math.min(1,(1-Math.sqrt(rr))*r);
        const atm=atmosphere[id];if(atm){const limb=Math.pow(1-z,5)*Math.max(0,dot)*.7;rgb=rgb.map((v,k)=>v*(1-limb)+atm[k]*limb);}
        // Ombre des anneaux sur la surface : intersection du rayon lumineux avec leur plan.
        if(rings){const normalX=-sr*tiltZ,normalY=cr*tiltZ,normalZ=-tilt,den=normalX*lx+normalY*ly+normalZ*lz,t=-(normalX*nx+normalY*ny+normalZ*z)/den;if(t>0){const rx=nx+t*lx,ry=ny+t*ly,rz=z+t*lz,rd=Math.hypot(rx,ry,rz);if(rd>1.22&&rd<2.17)rgb=rgb.map(v=>v*.46);}}
      }else if(rr<1.045&&atmosphere[id]){const a=Math.exp(-(Math.sqrt(rr)-1)*r*.7)*.24*Math.max(0,-nx*.57-ny*.42+.35);rgb=atmosphere[id];alpha=a;}
      if(rings){const rx=nx*cr+ny*sr,ry=-nx*sr+ny*cr,rz=ry/tilt*tiltZ,rad=Math.hypot(rx,ry/tilt);
        if(rad>1.22&&rad<2.17&&rz>z){const u=(rad-1.22)/.95,gap=rad>1.87&&rad<1.93;let a=ring?lire(ring,u,.5,3)/255:.65;a*=gap?.14:.9;
          // Le globe masque la lumière reçue par les anneaux.
          const dot=nx*lx+ny*ly+rz*lz,disc=dot*dot-(nx*nx+ny*ny+rz*rz-1),ombre=disc>0&&(-dot+Math.sqrt(disc))>0,lit=ombre?.12:.77;
          const rc=ring?[0,1,2].map(k=>lire(ring,u,.5,k)*lit):[184,170,141].map(v=>v*lit);
          const out=a+alpha*(1-a);rgb=rc.map((v,k)=>(v*a+(rgb?.[k]||0)*alpha*(1-a))/(out||1));alpha=out;
        }
      }
      if(rgb){d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=alpha*255;}
    }
    }
    return {pixels:d,rayon:r,taille};
}
