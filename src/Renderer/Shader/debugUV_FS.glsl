#include <logdepthbuf_pars_fragment>

varying vec2 vUv;

void main()  {
    #include <logdepthbuf_fragment>
    gl_FragColor = vec4(vUv.x * vUv.y, vUv.x * vUv.y, vUv.x * vUv.y, 1.0);
}
