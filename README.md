# Site personnel (Jekyll + GitHub Pages)

## Où modifier quoi

| Contenu                         | Fichier                       |
|---------------------------------|-------------------------------|
| Nom, statut, bio, liens, contact | `_data/profil.yml`           |
| Actualités                      | `_data/actualites.yml`        |
| Intérêts de recherche           | `_data/themes.yml`            |
| Publications                    | `_data/publications.yml`      |
| Projets et logiciels            | `_data/projets.yml`           |
| Enseignement / exposés          | `_data/enseignement.yml`, `_data/exposes.yml` |
| Photo, CV, PDF                  | `assets/img/`, `assets/files/` |
| Mise en page                    | `_layouts/default.html`, `index.html` |
| Couleurs et typographie         | `assets/css/style.css`        |

Un champ laissé vide (`""`) n'est pas affiché.

## Lancer en local

    bundle install
    bundle exec jekyll serve --livereload

Puis ouvrir http://localhost:4000. Les modifications de `_data/` sont prises en
compte automatiquement ; celles de `_config.yml` demandent de relancer le serveur.
