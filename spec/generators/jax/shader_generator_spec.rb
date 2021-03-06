require 'spec_helper'

describe 'jax:shader' do
  with_args "clouds" do
    it "should generate manifest file" do
      subject.should generate("app/assets/jax/shaders/clouds/manifest.yml")
    end

    it "should generate GLSL files" do
      subject.should generate("app/assets/jax/shaders/clouds/common.glsl")
      subject.should generate("app/assets/jax/shaders/clouds/fragment.glsl")
      subject.should generate("app/assets/jax/shaders/clouds/vertex.glsl")
    end

    it "should not generate JS files" do
      subject.should_not generate("app/assets/jax/shaders/clouds/material.js")
      subject.should_not generate("spec/javascripts/jax/shaders/clouds_spec.js")
    end
    
    it "should generate coffee files" do
      subject.should generate("app/assets/jax/shaders/clouds/material.js.coffee")
      subject.should generate("spec/javascripts/jax/shaders/clouds_spec.js.coffee")
    end
  end
  
  with_args "clouds", "-j" do
    it "should generate JS files" do
      subject.should generate("app/assets/jax/shaders/clouds/material.js")
      subject.should generate("spec/javascripts/jax/shaders/clouds_spec.js")
    end
    
    it "should not generate coffee files" do
      subject.should_not generate("app/assets/jax/shaders/clouds/material.js.coffee")
      subject.should_not generate("spec/javascripts/jax/shaders/clouds_spec.js.coffee")
    end
  end
end
