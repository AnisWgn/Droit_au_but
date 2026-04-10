"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[417],{5930:function(t,e,r){r.d(e,{Z:function(){return o}});var n=r(1119),i=r(2265),a=r(1448),s=r(5374);let o=i.forwardRef(function({args:[t=1,e=1,r=1]=[],radius:o=.05,steps:c=1,smoothness:l=4,bevelSegments:f=4,creaseAngle:u=.4,children:p,...h},g){let d=i.useMemo(()=>(function(t,e,r){let n=new a.Shape,i=r-1e-5;return n.absarc(1e-5,1e-5,1e-5,-Math.PI/2,-Math.PI,!0),n.absarc(1e-5,e-2*i,1e-5,Math.PI,Math.PI/2,!0),n.absarc(t-2*i,e-2*i,1e-5,Math.PI/2,0,!0),n.absarc(t-2*i,1e-5,1e-5,0,-Math.PI/2,!0),n})(t,e,o),[t,e,o]),v=i.useMemo(()=>({depth:r-2*o,bevelEnabled:!0,bevelSegments:2*f,steps:c,bevelSize:o-1e-5,bevelThickness:o,curveSegments:l}),[r,o,l]),m=i.useRef(null);return i.useLayoutEffect(()=>{m.current&&(m.current.center(),(0,s.LZ)(m.current,u))},[d,v]),i.createElement("mesh",(0,n.Z)({ref:g},h),i.createElement("extrudeGeometry",{ref:m,args:[d,v]}),p)})},697:function(t,e,r){r.d(e,{q:function(){return p}});var n=r(1119),i=r(2265),a=r(1448),s=r(9074),o=Object.defineProperty,c=(t,e,r)=>e in t?o(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r,l=(t,e,r)=>(c(t,"symbol"!=typeof e?e+"":e,r),r);let f=(()=>{let t={uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new a.Vector3},up:{value:new a.Vector3(0,1,0)}},vertexShader:`
      uniform vec3 sunPosition;
      uniform float rayleigh;
      uniform float turbidity;
      uniform float mieCoefficient;
      uniform vec3 up;

      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      // constants for atmospheric scattering
      const float e = 2.71828182845904523536028747135266249775724709369995957;
      const float pi = 3.141592653589793238462643383279502884197169;

      // wavelength of used primaries, according to preetham
      const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
      // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
      // (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
      const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

      // mie stuff
      // K coefficient for the primaries
      const float v = 4.0;
      const vec3 K = vec3( 0.686, 0.678, 0.666 );
      // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
      const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

      // earth shadow hack
      // cutoffAngle = pi / 1.95;
      const float cutoffAngle = 1.6110731556870734;
      const float steepness = 1.5;
      const float EE = 1000.0;

      float sunIntensity( float zenithAngleCos ) {
        zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
        return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
      }

      vec3 totalMie( float T ) {
        float c = ( 0.2 * T ) * 10E-18;
        return 0.434 * c * MieConst;
      }

      void main() {

        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position.z = gl_Position.w; // set z to camera.far

        vSunDirection = normalize( sunPosition );

        vSunE = sunIntensity( dot( vSunDirection, up ) );

        vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

        float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

      // extinction (absorbtion + out scattering)
      // rayleigh coefficients
        vBetaR = totalRayleigh * rayleighCoefficient;

      // mie coefficients
        vBetaM = totalMie( turbidity ) * mieCoefficient;

      }
    `,fragmentShader:`
      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      uniform float mieDirectionalG;
      uniform vec3 up;

      const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );

      // constants for atmospheric scattering
      const float pi = 3.141592653589793238462643383279502884197169;

      const float n = 1.0003; // refractive index of air
      const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

      // optical length at zenith for molecules
      const float rayleighZenithLength = 8.4E3;
      const float mieZenithLength = 1.25E3;
      // 66 arc seconds -> degrees, and the cosine of that
      const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

      // 3.0 / ( 16.0 * pi )
      const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
      // 1.0 / ( 4.0 * pi )
      const float ONE_OVER_FOURPI = 0.07957747154594767;

      float rayleighPhase( float cosTheta ) {
        return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
      }

      float hgPhase( float cosTheta, float g ) {
        float g2 = pow( g, 2.0 );
        float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
        return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
      }

      void main() {

        vec3 direction = normalize( vWorldPosition - cameraPos );

      // optical length
      // cutoff angle at 90 to avoid singularity in next formula.
        float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
        float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
        float sR = rayleighZenithLength * inverse;
        float sM = mieZenithLength * inverse;

      // combined extinction factor
        vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

      // in scattering
        float cosTheta = dot( direction, vSunDirection );

        float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
        vec3 betaRTheta = vBetaR * rPhase;

        float mPhase = hgPhase( cosTheta, mieDirectionalG );
        vec3 betaMTheta = vBetaM * mPhase;

        vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
        Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

      // nightsky
        float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
        float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
        vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
        vec3 L0 = vec3( 0.1 ) * Fex;

      // composition + solar disc
        float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
        L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

        vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

        vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

        gl_FragColor = vec4( retColor, 1.0 );

      #include <tonemapping_fragment>
      #include <${s.i>=154?"colorspace_fragment":"encodings_fragment"}>

      }
    `},e=new a.ShaderMaterial({name:"SkyShader",fragmentShader:t.fragmentShader,vertexShader:t.vertexShader,uniforms:a.UniformsUtils.clone(t.uniforms),side:a.BackSide,depthWrite:!1});class r extends a.Mesh{constructor(){super(new a.BoxGeometry(1,1,1),e)}}return l(r,"SkyShader",t),l(r,"material",e),r})();function u(t,e,r=new a.Vector3){let n=2*Math.PI*(e-.5);return r.x=Math.cos(n),r.y=Math.sin(Math.PI*(t-.5)),r.z=Math.sin(n),r}let p=i.forwardRef(({inclination:t=.6,azimuth:e=.1,distance:r=1e3,mieCoefficient:s=.005,mieDirectionalG:o=.8,rayleigh:c=.5,turbidity:l=10,sunPosition:p=u(t,e),...h},g)=>{let d=i.useMemo(()=>new a.Vector3().setScalar(r),[r]),[v]=i.useState(()=>new f);return i.createElement("primitive",(0,n.Z)({object:v,ref:g,"material-uniforms-mieCoefficient-value":s,"material-uniforms-mieDirectionalG-value":o,"material-uniforms-rayleigh-value":c,"material-uniforms-sunPosition-value":p,"material-uniforms-turbidity-value":l,scale:d},h))})},1:function(t,e,r){r.d(e,{Ab:function(){return a}});var n=r(1119),i=r(2265);let a=function(t,e){let r=t+"Geometry";return i.forwardRef(({args:t,children:e,...a},s)=>{let o=i.useRef(null);return i.useImperativeHandle(s,()=>o.current),i.useLayoutEffect(()=>void 0),i.createElement("mesh",(0,n.Z)({ref:o},a),i.createElement(r,{attach:"geometry",args:t}),e)})}("cylinder")},6498:function(t,e,r){r.d(e,{ZP:function(){return t_}});var n,i,a,s,o,c,l,f,u,p,h,g=r(3860),d={},v=180/Math.PI,m=Math.PI/180,y=Math.atan2,x=/([A-Z])/g,b=/(left|right|width|margin|padding|x)/i,w=/[\s,\(]\S/,P={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},M=function(t,e){return e.set(e.t,e.p,Math.round((e.s+e.c*t)*1e4)/1e4+e.u,e)},O=function(t,e){return e.set(e.t,e.p,1===t?e.e:Math.round((e.s+e.c*t)*1e4)/1e4+e.u,e)},_=function(t,e){return e.set(e.t,e.p,t?Math.round((e.s+e.c*t)*1e4)/1e4+e.u:e.b,e)},S=function(t,e){return e.set(e.t,e.p,1===t?e.e:t?Math.round((e.s+e.c*t)*1e4)/1e4+e.u:e.b,e)},E=function(t,e){var r=e.s+e.c*t;e.set(e.t,e.p,~~(r+(r<0?-.5:.5))+e.u,e)},C=function(t,e){return e.set(e.t,e.p,t?e.e:e.b,e)},F=function(t,e){return e.set(e.t,e.p,1!==t?e.b:e.e,e)},T=function(t,e,r){return t.style[e]=r},A=function(t,e,r){return t.style.setProperty(e,r)},z=function(t,e,r){return t._gsap[e]=r},R=function(t,e,r){return t._gsap.scaleX=t._gsap.scaleY=r},B=function(t,e,r,n,i){var a=t._gsap;a.scaleX=a.scaleY=r,a.renderTransform(i,a)},k=function(t,e,r,n,i){var a=t._gsap;a[e]=r,a.renderTransform(i,a)},I="transform",Y=I+"Origin",D=function t(e,r){var n=this,i=this.target,a=i.style,s=i._gsap;if(e in d&&a){if(this.tfm=this.tfm||{},"transform"===e)return P.transform.split(",").forEach(function(e){return t.call(n,e,r)});if(~(e=P[e]||e).indexOf(",")?e.split(",").forEach(function(t){return n.tfm[t]=tr(i,t)}):this.tfm[e]=s.x?s[e]:tr(i,e),e===Y&&(this.tfm.zOrigin=s.zOrigin),this.props.indexOf(I)>=0)return;s.svg&&(this.svgo=i.getAttribute("data-svg-origin"),this.props.push(Y,r,"")),e=I}(a||r)&&this.props.push(e,r,a[e])},X=function(t){t.translate&&(t.removeProperty("translate"),t.removeProperty("scale"),t.removeProperty("rotate"))},L=function(){var t,e,r=this.props,n=this.target,i=n.style,a=n._gsap;for(t=0;t<r.length;t+=3)r[t+1]?2===r[t+1]?n[r[t]](r[t+2]):n[r[t]]=r[t+2]:r[t+2]?i[r[t]]=r[t+2]:i.removeProperty("--"===r[t].substr(0,2)?r[t]:r[t].replace(x,"-$1").toLowerCase());if(this.tfm){for(e in this.tfm)a[e]=this.tfm[e];a.svg&&(a.renderTransform(),n.setAttribute("data-svg-origin",this.svgo||"")),(t=p())&&t.isStart||i[I]||(X(i),a.zOrigin&&i[Y]&&(i[Y]+=" "+a.zOrigin+"px",a.zOrigin=0,a.renderTransform()),a.uncache=1)}},N=function(t,e){var r={target:t,props:[],revert:L,save:D};return t._gsap||g.p8.core.getCache(t),e&&t.style&&t.nodeType&&e.split(",").forEach(function(t){return r.save(t)}),r},W=function(t,e){var r=o.createElementNS?o.createElementNS((e||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),t):o.createElement(t);return r&&r.style?r:o.createElement(t)},V=function t(e,r,n){var i=getComputedStyle(e);return i[r]||i.getPropertyValue(r.replace(x,"-$1").toLowerCase())||i.getPropertyValue(r)||!n&&t(e,G(r)||r,1)||""},Z="O,Moz,ms,Ms,Webkit".split(","),G=function(t,e,r){var n=(e||f).style,i=5;if(t in n&&!r)return t;for(t=t.charAt(0).toUpperCase()+t.substr(1);i--&&!(Z[i]+t in n););return i<0?null:(3===i?"ms":i>=0?Z[i]:"")+t},j=function(){"undefined"!=typeof window&&window.document&&(c=(o=window.document).documentElement,f=W("div")||{style:{}},W("div"),Y=(I=G(I))+"Origin",f.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",h=!!G("perspective"),p=g.p8.core.reverting,l=1)},q=function(t){var e,r=t.ownerSVGElement,n=W("svg",r&&r.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),i=t.cloneNode(!0);i.style.display="block",n.appendChild(i),c.appendChild(n);try{e=i.getBBox()}catch(t){}return n.removeChild(i),c.removeChild(n),e},U=function(t,e){for(var r=e.length;r--;)if(t.hasAttribute(e[r]))return t.getAttribute(e[r])},H=function(t){var e,r;try{e=t.getBBox()}catch(n){e=q(t),r=1}return e&&(e.width||e.height)||r||(e=q(t)),!e||e.width||e.x||e.y?e:{x:+U(t,["x","cx","x1"])||0,y:+U(t,["y","cy","y1"])||0,width:0,height:0}},K=function(t){return!!(t.getCTM&&(!t.parentNode||t.ownerSVGElement)&&H(t))},$=function(t,e){if(e){var r,n=t.style;e in d&&e!==Y&&(e=I),n.removeProperty?(("ms"===(r=e.substr(0,2))||"webkit"===e.substr(0,6))&&(e="-"+e),n.removeProperty("--"===r?e:e.replace(x,"-$1").toLowerCase())):n.removeAttribute(e)}},J=function(t,e,r,n,i,a){var s=new g.Fo(t._pt,e,r,0,1,a?F:C);return t._pt=s,s.b=n,s.e=i,t._props.push(r),s},Q={deg:1,rad:1,turn:1},tt={grid:1,flex:1},te=function t(e,r,n,i){var a,s,c,l,u=parseFloat(n)||0,p=(n+"").trim().substr((u+"").length)||"px",h=f.style,v=b.test(r),m="svg"===e.tagName.toLowerCase(),y=(m?"client":"offset")+(v?"Width":"Height"),x="px"===i,w="%"===i;if(i===p||!u||Q[i]||Q[p])return u;if("px"===p||x||(u=t(e,r,n,"px")),l=e.getCTM&&K(e),(w||"%"===p)&&(d[r]||~r.indexOf("adius")))return a=l?e.getBBox()[v?"width":"height"]:e[y],(0,g.Pr)(w?u/a*100:u/100*a);if(h[v?"width":"height"]=100+(x?p:i),s="rem"!==i&&~r.indexOf("adius")||"em"===i&&e.appendChild&&!m?e:e.parentNode,l&&(s=(e.ownerSVGElement||{}).parentNode),s&&s!==o&&s.appendChild||(s=o.body),(c=s._gsap)&&w&&c.width&&v&&c.time===g.xr.time&&!c.uncache)return(0,g.Pr)(u/c.width*100);if(w&&("height"===r||"width"===r)){var P=e.style[r];e.style[r]=100+i,a=e[y],P?e.style[r]=P:$(e,r)}else(w||"%"===p)&&!tt[V(s,"display")]&&(h.position=V(e,"position")),s===e&&(h.position="static"),s.appendChild(f),a=f[y],s.removeChild(f),h.position="absolute";return v&&w&&((c=(0,g.DY)(s)).time=g.xr.time,c.width=s[y]),(0,g.Pr)(x?a*u/100:a&&u?100/a*u:0)},tr=function(t,e,r,n){var i;return l||j(),e in P&&"transform"!==e&&~(e=P[e]).indexOf(",")&&(e=e.split(",")[0]),d[e]&&"transform"!==e?(i=tg(t,n),i="transformOrigin"!==e?i[e]:i.svg?i.origin:td(V(t,Y))+" "+i.zOrigin+"px"):(!(i=t.style[e])||"auto"===i||n||~(i+"").indexOf("calc("))&&(i=to[e]&&to[e](t,e,r)||V(t,e)||(0,g.Ok)(t,e)||("opacity"===e?1:0)),r&&!~(i+"").trim().indexOf(" ")?te(t,e,i,r)+r:i},tn=function(t,e,r,n){if(!r||"none"===r){var i=G(e,t,1),a=i&&V(t,i,1);a&&a!==r?(e=i,r=a):"borderColor"===e&&(r=V(t,"borderTopColor"))}var s,o,c,l,f,u,p,h,d,v,m,y=new g.Fo(this._pt,t.style,e,0,1,g.Ks),x=0,b=0;if(y.b=r,y.e=n,r+="","var(--"===(n+="").substring(0,6)&&(n=V(t,n.substring(4,n.indexOf(")")))),"auto"===n&&(u=t.style[e],t.style[e]=n,n=V(t,e)||n,u?t.style[e]=u:$(t,e)),s=[r,n],(0,g.kr)(s),r=s[0],n=s[1],c=r.match(g.d4)||[],(n.match(g.d4)||[]).length){for(;o=g.d4.exec(n);)p=o[0],d=n.substring(x,o.index),f?f=(f+1)%5:("rgba("===d.substr(-5)||"hsla("===d.substr(-5))&&(f=1),p!==(u=c[b++]||"")&&(l=parseFloat(u)||0,m=u.substr((l+"").length),"="===p.charAt(1)&&(p=(0,g.cy)(l,p)+m),h=parseFloat(p),v=p.substr((h+"").length),x=g.d4.lastIndex-v.length,v||(v=v||g.Fc.units[e]||m,x!==n.length||(n+=v,y.e+=v)),m!==v&&(l=te(t,e,u,v)||0),y._pt={_next:y._pt,p:d||1===b?d:",",s:l,c:h-l,m:f&&f<4||"zIndex"===e?Math.round:0});y.c=x<n.length?n.substring(x,n.length):""}else y.r="display"===e&&"none"===n?F:C;return g.bQ.test(n)&&(y.e=0),this._pt=y,y},ti={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},ta=function(t){var e=t.split(" "),r=e[0],n=e[1]||"50%";return("top"===r||"bottom"===r||"left"===n||"right"===n)&&(t=r,r=n,n=t),e[0]=ti[r]||r,e[1]=ti[n]||n,e.join(" ")},ts=function(t,e){if(e.tween&&e.tween._time===e.tween._dur){var r,n,i,a=e.t,s=a.style,o=e.u,c=a._gsap;if("all"===o||!0===o)s.cssText="",n=1;else for(i=(o=o.split(",")).length;--i>-1;)d[r=o[i]]&&(n=1,r="transformOrigin"===r?Y:I),$(a,r);n&&($(a,I),c&&(c.svg&&a.removeAttribute("transform"),s.scale=s.rotate=s.translate="none",tg(a,1),c.uncache=1,X(s)))}},to={clearProps:function(t,e,r,n,i){if("isFromStart"!==i.data){var a=t._pt=new g.Fo(t._pt,e,r,0,0,ts);return a.u=n,a.pr=-10,a.tween=i,t._props.push(r),1}}},tc=[1,0,0,1,0,0],tl={},tf=function(t){return"matrix(1, 0, 0, 1, 0, 0)"===t||"none"===t||!t},tu=function(t){var e=V(t,I);return tf(e)?tc:e.substr(7).match(g.SI).map(g.Pr)},tp=function(t,e){var r,n,i,a,s=t._gsap||(0,g.DY)(t),o=t.style,l=tu(t);return s.svg&&t.getAttribute("transform")?"1,0,0,1,0,0"===(l=[(i=t.transform.baseVal.consolidate().matrix).a,i.b,i.c,i.d,i.e,i.f]).join(",")?tc:l:(l!==tc||t.offsetParent||t===c||s.svg||(i=o.display,o.display="block",(r=t.parentNode)&&(t.offsetParent||t.getBoundingClientRect().width)||(a=1,n=t.nextElementSibling,c.appendChild(t)),l=tu(t),i?o.display=i:$(t,"display"),a&&(n?r.insertBefore(t,n):r?r.appendChild(t):c.removeChild(t))),e&&l.length>6?[l[0],l[1],l[4],l[5],l[12],l[13]]:l)},th=function(t,e,r,n,i,a){var s,o,c,l,f=t._gsap,u=i||tp(t,!0),p=f.xOrigin||0,h=f.yOrigin||0,g=f.xOffset||0,d=f.yOffset||0,v=u[0],m=u[1],y=u[2],x=u[3],b=u[4],w=u[5],P=e.split(" "),M=parseFloat(P[0])||0,O=parseFloat(P[1])||0;r?u!==tc&&(o=v*x-m*y)&&(c=x/o*M+-y/o*O+(y*w-x*b)/o,l=-m/o*M+v/o*O-(v*w-m*b)/o,M=c,O=l):(M=(s=H(t)).x+(~P[0].indexOf("%")?M/100*s.width:M),O=s.y+(~(P[1]||P[0]).indexOf("%")?O/100*s.height:O)),n||!1!==n&&f.smooth?(b=M-p,w=O-h,f.xOffset=g+(b*v+w*y)-b,f.yOffset=d+(b*m+w*x)-w):f.xOffset=f.yOffset=0,f.xOrigin=M,f.yOrigin=O,f.smooth=!!n,f.origin=e,f.originIsAbsolute=!!r,t.style[Y]="0px 0px",a&&(J(a,f,"xOrigin",p,M),J(a,f,"yOrigin",h,O),J(a,f,"xOffset",g,f.xOffset),J(a,f,"yOffset",d,f.yOffset)),t.setAttribute("data-svg-origin",M+" "+O)},tg=function(t,e){var r=t._gsap||new g.l1(t);if("x"in r&&!e&&!r.uncache)return r;var n,i,a,s,o,c,l,f,u,p,d,x,b,w,P,M,O,_,S,E,C,F,T,A,z,R,B,k,D,X,L,N,W=t.style,Z=r.scaleX<0,G=getComputedStyle(t),j=V(t,Y)||"0";return n=i=a=c=l=f=u=p=d=0,s=o=1,r.svg=!!(t.getCTM&&K(t)),G.translate&&(("none"!==G.translate||"none"!==G.scale||"none"!==G.rotate)&&(W[I]=("none"!==G.translate?"translate3d("+(G.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+("none"!==G.rotate?"rotate("+G.rotate+") ":"")+("none"!==G.scale?"scale("+G.scale.split(" ").join(",")+") ":"")+("none"!==G[I]?G[I]:"")),W.scale=W.rotate=W.translate="none"),w=tp(t,r.svg),r.svg&&(r.uncache?(z=t.getBBox(),j=r.xOrigin-z.x+"px "+(r.yOrigin-z.y)+"px",A=""):A=!e&&t.getAttribute("data-svg-origin"),th(t,A||j,!!A||r.originIsAbsolute,!1!==r.smooth,w)),x=r.xOrigin||0,b=r.yOrigin||0,w!==tc&&(_=w[0],S=w[1],E=w[2],C=w[3],n=F=w[4],i=T=w[5],6===w.length?(s=Math.sqrt(_*_+S*S),o=Math.sqrt(C*C+E*E),c=_||S?y(S,_)*v:0,(u=E||C?y(E,C)*v+c:0)&&(o*=Math.abs(Math.cos(u*m))),r.svg&&(n-=x-(x*_+b*E),i-=b-(x*S+b*C))):(N=w[6],X=w[7],B=w[8],k=w[9],D=w[10],L=w[11],n=w[12],i=w[13],a=w[14],l=(P=y(N,D))*v,P&&(A=F*(M=Math.cos(-P))+B*(O=Math.sin(-P)),z=T*M+k*O,R=N*M+D*O,B=-(F*O)+B*M,k=-(T*O)+k*M,D=-(N*O)+D*M,L=-(X*O)+L*M,F=A,T=z,N=R),f=(P=y(-E,D))*v,P&&(A=_*(M=Math.cos(-P))-B*(O=Math.sin(-P)),z=S*M-k*O,R=E*M-D*O,L=C*O+L*M,_=A,S=z,E=R),c=(P=y(S,_))*v,P&&(A=_*(M=Math.cos(P))+S*(O=Math.sin(P)),z=F*M+T*O,S=S*M-_*O,T=T*M-F*O,_=A,F=z),l&&Math.abs(l)+Math.abs(c)>359.9&&(l=c=0,f=180-f),s=(0,g.Pr)(Math.sqrt(_*_+S*S+E*E)),o=(0,g.Pr)(Math.sqrt(T*T+N*N)),u=Math.abs(P=y(F,T))>2e-4?P*v:0,d=L?1/(L<0?-L:L):0),r.svg&&(A=t.getAttribute("transform"),r.forceCSS=t.setAttribute("transform","")||!tf(V(t,I)),A&&t.setAttribute("transform",A))),Math.abs(u)>90&&270>Math.abs(u)&&(Z?(s*=-1,u+=c<=0?180:-180,c+=c<=0?180:-180):(o*=-1,u+=u<=0?180:-180)),e=e||r.uncache,r.x=n-((r.xPercent=n&&(!e&&r.xPercent||(Math.round(t.offsetWidth/2)===Math.round(-n)?-50:0)))?t.offsetWidth*r.xPercent/100:0)+"px",r.y=i-((r.yPercent=i&&(!e&&r.yPercent||(Math.round(t.offsetHeight/2)===Math.round(-i)?-50:0)))?t.offsetHeight*r.yPercent/100:0)+"px",r.z=a+"px",r.scaleX=(0,g.Pr)(s),r.scaleY=(0,g.Pr)(o),r.rotation=(0,g.Pr)(c)+"deg",r.rotationX=(0,g.Pr)(l)+"deg",r.rotationY=(0,g.Pr)(f)+"deg",r.skewX=u+"deg",r.skewY=p+"deg",r.transformPerspective=d+"px",(r.zOrigin=parseFloat(j.split(" ")[2])||!e&&r.zOrigin||0)&&(W[Y]=td(j)),r.xOffset=r.yOffset=0,r.force3D=g.Fc.force3D,r.renderTransform=r.svg?tb:h?tx:tm,r.uncache=0,r},td=function(t){return(t=t.split(" "))[0]+" "+t[1]},tv=function(t,e,r){var n=(0,g.Wy)(e);return(0,g.Pr)(parseFloat(e)+parseFloat(te(t,"x",r+"px",n)))+n},tm=function(t,e){e.z="0px",e.rotationY=e.rotationX="0deg",e.force3D=0,tx(t,e)},ty="0deg",tx=function(t,e){var r=e||this,n=r.xPercent,i=r.yPercent,a=r.x,s=r.y,o=r.z,c=r.rotation,l=r.rotationY,f=r.rotationX,u=r.skewX,p=r.skewY,h=r.scaleX,g=r.scaleY,d=r.transformPerspective,v=r.force3D,y=r.target,x=r.zOrigin,b="",w="auto"===v&&t&&1!==t||!0===v;if(x&&(f!==ty||l!==ty)){var P,M=parseFloat(l)*m,O=Math.sin(M),_=Math.cos(M);a=tv(y,a,-(O*(P=Math.cos(M=parseFloat(f)*m))*x)),s=tv(y,s,-(-Math.sin(M)*x)),o=tv(y,o,-(_*P*x)+x)}"0px"!==d&&(b+="perspective("+d+") "),(n||i)&&(b+="translate("+n+"%, "+i+"%) "),(w||"0px"!==a||"0px"!==s||"0px"!==o)&&(b+="0px"!==o||w?"translate3d("+a+", "+s+", "+o+") ":"translate("+a+", "+s+") "),c!==ty&&(b+="rotate("+c+") "),l!==ty&&(b+="rotateY("+l+") "),f!==ty&&(b+="rotateX("+f+") "),(u!==ty||p!==ty)&&(b+="skew("+u+", "+p+") "),(1!==h||1!==g)&&(b+="scale("+h+", "+g+") "),y.style[I]=b||"translate(0, 0)"},tb=function(t,e){var r,n,i,a,s,o=e||this,c=o.xPercent,l=o.yPercent,f=o.x,u=o.y,p=o.rotation,h=o.skewX,d=o.skewY,v=o.scaleX,y=o.scaleY,x=o.target,b=o.xOrigin,w=o.yOrigin,P=o.xOffset,M=o.yOffset,O=o.forceCSS,_=parseFloat(f),S=parseFloat(u);p=parseFloat(p),h=parseFloat(h),(d=parseFloat(d))&&(h+=d=parseFloat(d),p+=d),p||h?(p*=m,h*=m,r=Math.cos(p)*v,n=Math.sin(p)*v,i=-(Math.sin(p-h)*y),a=Math.cos(p-h)*y,h&&(d*=m,i*=s=Math.sqrt(1+(s=Math.tan(h-d))*s),a*=s,d&&(r*=s=Math.sqrt(1+(s=Math.tan(d))*s),n*=s)),r=(0,g.Pr)(r),n=(0,g.Pr)(n),i=(0,g.Pr)(i),a=(0,g.Pr)(a)):(r=v,a=y,n=i=0),(_&&!~(f+"").indexOf("px")||S&&!~(u+"").indexOf("px"))&&(_=te(x,"x",f,"px"),S=te(x,"y",u,"px")),(b||w||P||M)&&(_=(0,g.Pr)(_+b-(b*r+w*i)+P),S=(0,g.Pr)(S+w-(b*n+w*a)+M)),(c||l)&&(s=x.getBBox(),_=(0,g.Pr)(_+c/100*s.width),S=(0,g.Pr)(S+l/100*s.height)),s="matrix("+r+","+n+","+i+","+a+","+_+","+S+")",x.setAttribute("transform",s),O&&(x.style[I]=s)},tw=function(t,e,r,n,i){var a,s,o=(0,g.r9)(i),c=parseFloat(i)*(o&&~i.indexOf("rad")?v:1)-n,l=n+c+"deg";return o&&("short"===(a=i.split("_")[1])&&(c%=360)!=c%180&&(c+=c<0?360:-360),"cw"===a&&c<0?c=(c+36e9)%360-360*~~(c/360):"ccw"===a&&c>0&&(c=(c-36e9)%360-360*~~(c/360))),t._pt=s=new g.Fo(t._pt,e,r,n,c,O),s.e=l,s.u="deg",t._props.push(r),s},tP=function(t,e){for(var r in e)t[r]=e[r];return t},tM=function(t,e,r){var n,i,a,s,o,c,l,f=tP({},r._gsap),u=r.style;for(i in f.svg?(a=r.getAttribute("transform"),r.setAttribute("transform",""),u[I]=e,n=tg(r,1),$(r,I),r.setAttribute("transform",a)):(a=getComputedStyle(r)[I],u[I]=e,n=tg(r,1),u[I]=a),d)(a=f[i])!==(s=n[i])&&0>"perspective,force3D,transformOrigin,svgOrigin".indexOf(i)&&(o=(0,g.Wy)(a)!==(l=(0,g.Wy)(s))?te(r,i,a,l):parseFloat(a),c=parseFloat(s),t._pt=new g.Fo(t._pt,n,i,o,c-o,M),t._pt.u=l||0,t._props.push(i));tP(n,f)};(0,g.fS)("padding,margin,Width,Radius",function(t,e){var r="Right",n="Bottom",i="Left",a=(e<3?["Top",r,n,i]:["Top"+i,"Top"+r,n+r,n+i]).map(function(r){return e<2?t+r:"border"+r+t});to[e>1?"border"+t:t]=function(t,e,r,n,i){var s,o;if(arguments.length<4)return 5===(o=(s=a.map(function(e){return tr(t,e,r)})).join(" ")).split(s[0]).length?s[0]:o;s=(n+"").split(" "),o={},a.forEach(function(t,e){return o[t]=s[e]=s[e]||s[(e-1)/2|0]}),t.init(e,o,i)}});var tO={name:"css",register:j,targetTest:function(t){return t.style&&t.nodeType},init:function(t,e,r,n,i){var a,s,o,c,f,u,p,h,v,m,y,x,b,O,C,F,T,A=this._props,z=t.style,R=r.vars.startAt;for(p in l||j(),this.styles=this.styles||N(t),F=this.styles.props,this.tween=r,e)if("autoRound"!==p&&(s=e[p],!(g.$i[p]&&(0,g.if)(p,e,r,n,t,i)))){if(f=typeof s,u=to[p],"function"===f&&(f=typeof(s=s.call(r,n,t,i))),"string"===f&&~s.indexOf("random(")&&(s=(0,g.UI)(s)),u)u(this,t,p,s,r)&&(C=1);else if("--"===p.substr(0,2))a=(getComputedStyle(t).getPropertyValue(p)+"").trim(),s+="",g.GN.lastIndex=0,!g.GN.test(a)&&(h=(0,g.Wy)(a),(v=(0,g.Wy)(s))?h!==v&&(a=te(t,p,a,v)+v):h&&(s+=h)),this.add(z,"setProperty",a,s,n,i,0,0,p),A.push(p),F.push(p,0,z[p]);else if("undefined"!==f){if(R&&p in R?(a="function"==typeof R[p]?R[p].call(r,n,t,i):R[p],(0,g.r9)(a)&&~a.indexOf("random(")&&(a=(0,g.UI)(a)),(0,g.Wy)(a+"")||"auto"===a||(a+=g.Fc.units[p]||(0,g.Wy)(tr(t,p))||""),"="===(a+"").charAt(1)&&(a=tr(t,p))):a=tr(t,p),c=parseFloat(a),(m="string"===f&&"="===s.charAt(1)&&s.substr(0,2))&&(s=s.substr(2)),o=parseFloat(s),p in P&&("autoAlpha"===p&&(1===c&&"hidden"===tr(t,"visibility")&&o&&(c=0),F.push("visibility",0,z.visibility),J(this,z,"visibility",c?"inherit":"hidden",o?"inherit":"hidden",!o)),"scale"!==p&&"transform"!==p&&~(p=P[p]).indexOf(",")&&(p=p.split(",")[0])),y=p in d){if(this.styles.save(p),T=s,"string"===f&&"var(--"===s.substring(0,6)){if("calc("===(s=V(t,s.substring(4,s.indexOf(")")))).substring(0,5)){var B=t.style.perspective;t.style.perspective=s,s=V(t,"perspective"),B?t.style.perspective=B:$(t,"perspective")}o=parseFloat(s)}if(x||((b=t._gsap).renderTransform&&!e.parseTransform||tg(t,e.parseTransform),O=!1!==e.smoothOrigin&&b.smooth,(x=this._pt=new g.Fo(this._pt,z,I,0,1,b.renderTransform,b,0,-1)).dep=1),"scale"===p)this._pt=new g.Fo(this._pt,b,"scaleY",b.scaleY,(m?(0,g.cy)(b.scaleY,m+o):o)-b.scaleY||0,M),this._pt.u=0,A.push("scaleY",p),p+="X";else if("transformOrigin"===p){F.push(Y,0,z[Y]),s=ta(s),b.svg?th(t,s,0,O,0,this):((v=parseFloat(s.split(" ")[2])||0)!==b.zOrigin&&J(this,b,"zOrigin",b.zOrigin,v),J(this,z,p,td(a),td(s)));continue}else if("svgOrigin"===p){th(t,s,1,O,0,this);continue}else if(p in tl){tw(this,b,p,c,m?(0,g.cy)(c,m+s):s);continue}else if("smoothOrigin"===p){J(this,b,"smooth",b.smooth,s);continue}else if("force3D"===p){b[p]=s;continue}else if("transform"===p){tM(this,s,t);continue}}else p in z||(p=G(p)||p);if(y||(o||0===o)&&(c||0===c)&&!w.test(s)&&p in z)h=(a+"").substr((c+"").length),o||(o=0),v=(0,g.Wy)(s)||(p in g.Fc.units?g.Fc.units[p]:h),h!==v&&(c=te(t,p,a,v)),this._pt=new g.Fo(this._pt,y?b:z,p,c,(m?(0,g.cy)(c,m+o):o)-c,y||"px"!==v&&"zIndex"!==p||!1===e.autoRound?M:E),this._pt.u=v||0,y&&T!==s?(this._pt.b=a,this._pt.e=T,this._pt.r=S):h!==v&&"%"!==v&&(this._pt.b=a,this._pt.r=_);else if(p in z)tn.call(this,t,p,a,m?m+s:s);else if(p in t)this.add(t,p,a||t[p],m?m+s:s,n,i);else if("parseTransform"!==p){(0,g.lC)(p,s);continue}y||(p in z?F.push(p,0,z[p]):"function"==typeof t[p]?F.push(p,2,t[p]()):F.push(p,1,a||t[p])),A.push(p)}}C&&(0,g.JV)(this)},render:function(t,e){if(e.tween._time||!p())for(var r=e._pt;r;)r.r(t,r.d),r=r._next;else e.styles.revert()},get:tr,aliases:P,getSetter:function(t,e,r){var n=P[e];return n&&0>n.indexOf(",")&&(e=n),e in d&&e!==Y&&(t._gsap.x||tr(t,"x"))?r&&u===r?"scale"===e?R:z:(u=r||{},"scale"===e?B:k):t.style&&!(0,g.m2)(t.style[e])?T:~e.indexOf("-")?A:(0,g.S5)(t,e)},core:{_removeProperty:$,_getMatrix:tp}};g.p8.utils.checkPrefix=G,g.p8.core.getStyleSaver=N,n="x,y,z,scale,scaleX,scaleY,xPercent,yPercent",i="rotation,rotationX,rotationY,skewX,skewY",a="0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY",s=(0,g.fS)(n+","+i+",transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective",function(t){d[t]=1}),(0,g.fS)(i,function(t){g.Fc.units[t]="deg",tl[t]=1}),P[s[13]]=n+","+i,(0,g.fS)(a,function(t){var e=t.split(":");P[e[1]]=s[e[0]]}),(0,g.fS)("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(t){g.Fc.units[t]="px"}),g.p8.registerPlugin(tO);var t_=g.p8.registerPlugin(tO)||g.p8;t_.core.Tween}}]);