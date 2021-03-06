class Jax::SuiteController < ActionController::Base
  layout :layout
  helper_method :webgl_start
  
  def index
    redirect_to :action => :run_webgl
  end
  
  def jasmine
    # order helpers before specs
    @specs = helpers + specs
  end
  
  def spec
    render :text => Jax.config.specs[params[:id]].to_s
  end
  
  private
  def webgl_start
    Jax.config.webgl_start
  end
  
  def helpers
    collect_spec_files_matching /_helper\./
  end
  
  def specs
    collect_spec_files_matching /([sS]pec|[tT]est)\./
  end
  
  def collect_spec_files_matching(pattern)
    [].tap do |files|
      Jax.config.specs.each_file do |file|
        file = Jax.config.specs.attributes_for(file).logical_path
        if file =~ pattern
          files << file
        end
      end
    end
  end
  
  def layout
    case params[:action]
    when 'spec' then nil
    else 'jax'
    end
  end
end
