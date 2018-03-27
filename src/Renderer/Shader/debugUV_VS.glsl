#include <logdepthbuf_pars_vertex>

#define EPSILON 1e-6

varying vec2 vUv;

void main()  {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position ,1.0 );
    #include <logdepthbuf_vertex>
}
