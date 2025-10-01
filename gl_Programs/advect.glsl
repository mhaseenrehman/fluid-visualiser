#version 300 es

precision highp float;
precision highp sampler2D;

// Timestep since last iteration, 1 / Grid scale, Input Velocity field texture, Field to be advected
uniform sampler2D velocityGrid;
uniform sampler2D advectedGrid;

// Timestep for iteration and dissipation for rate of removal of dye
uniform float timestep;
uniform float dissipation;

// Grid Size and Scale
uniform vec2 gridSize;
uniform float gridScale;

// Linearly interpolate between the 4 closest points in the grid
vec4 fourBilinearInterpolation(sampler2D field, vec2 pos) {
    vec4 st;
    st.xy = floor(pos - 0.5) + 0.5;
    st.zw = st.xy + 1.0;
    vec2 t = pos - st.xy;

    // Sample texture at interpolated positions
    vec4 uv = st / gridSize.xyxy;
    vec4 t_1 = texture(field, uv.xy).xy;
    vec4 t_2 = texture(field, uv.zy).xy;
    vec4 t_3 = texture(field, uv.xw).xy;
    vec4 t_4 = texture(field, uv.zw).xy;

    // Bilinear Interpolation
    return mix(mix(t_1, t_2, t.x), mix(t_3, t_4, t.x), t.y);
}

// Entry into shader
void main() {
    // May not be texture(...).xy might be texture(...).zw
    vec2 uv = gl_FragCoord.xy / gridSize.xy;
    float rdx = 1.0 / gridScale;

    // Going back in time to calculate original position
    vec2 position = gl_FragCoord.xy - timestep * rdx * texture(velocityGrid, coords).xy;
    
    // Final velocity field - Advected quanitity
    gl_FragCoord = vec4(dissipation * fourBilinearInterpolation(advectedGrid, position), 0.0, 1.0);
}