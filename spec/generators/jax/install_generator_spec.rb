require 'spec_helper'

describe 'jax:install' do
  before_generation do
    FileUtils.mkdir_p "config"
    FileUtils.touch "config/routes.rb"
  end
  
  it "should mount Jax::Engine in routes" do
    subject.should generate(:route)
  end
  
  it "should generate Coffee application helper" do
    subject.should generate("app/assets/jax/helpers/application_helper.js.coffee")
  end
  
  it "should generate Coffee application controller" do
    subject.should generate("app/assets/jax/controllers/application_controller.js.coffee")
  end
  
  with_args "--without-coffeescript" do
    it "should generate JS application controller" do
      subject.should generate("app/assets/jax/controllers/application_controller.js")
    end
    
    it "should generate JS application helper" do
      subject.should generate("app/assets/jax/helpers/application_helper.js")
    end
  end
end
