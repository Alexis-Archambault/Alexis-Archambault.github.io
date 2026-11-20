source "https://rubygems.org"

# Même version de Jekyll et des extensions que les serveurs de GitHub Pages
gem "github-pages", ">= 232", group: :jekyll_plugins

# Nécessaire pour « jekyll serve » avec Ruby 3 et plus
gem "webrick"

# Bibliothèques retirées de Ruby 3.4 ; sans effet sur les versions antérieures
gem "csv"
gem "base64"
gem "bigdecimal"
gem "logger"

# Windows uniquement
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end
