const float LOG2 = 1.442695;

void main(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular) {
  float fog;
  float error = 0.0;
  float distance = length(gl_FragCoord.z / gl_FragCoord.w);

  if (Algorithm == <%=Jax.LINEAR%>) {
    fog = (End - distance) * Scale;
  } else if (Algorithm == <%=Jax.EXPONENTIAL%>) {
    fog = exp(-Density * distance);
  } else if (Algorithm == <%=Jax.EXP2%>) {
    fog = exp2(-Density * Density * distance * distance * LOG2);
  } else {
    /* error condition, output red */
    ambient = diffuse = specular = vec4(1,0,0,1);
    error = 1.0;
  }

  if (error != 1.0) {
    fog = clamp(fog, 0.0, 1.0);
  
    ambient  = mix(FogColor,  ambient,  fog);
    diffuse  = mix(FogColor,  diffuse,  fog);
  }
}
