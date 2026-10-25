<div align="center">

# slopfix

**Votre texte sonne comme du ChatGPT. slopfix trouve pourquoi, et le corrige.**

Un linter sans dépendance pour les tics d'écriture IA : tirets cadratins, `ce n'est pas X, c'est Y`, `plongeons dans`, `j'espère que cela vous aide !`, emojis en guise de puces et plus de 200 autres. Français et anglais. CLI, librairie, GitHub Action, skill pour agents IA et [playground dans le navigateur](https://zwarmex.github.io/slopfix/).

[Essayer dans le navigateur](https://zwarmex.github.io/slopfix/) · [English](README.md)

</div>

```bash
npx slopfix article.md
```

## Pourquoi

Tout le monde repère un texte généré en deux secondes, et arrête de lire. Les recruteurs zappent la lettre de motivation, les lecteurs quittent l'article, les mainteneurs ferment la pull request. Les tics sont toujours les mêmes, et la plupart sont mécaniques :

<!-- slopfix-disable -->

| Tic | Exemple | slopfix |
| --- | --- | --- |
| Tirets cadratins partout | `rapide (tiret) et simple (tiret) par nature` | signale, remplace par `, ` |
| Parallélisme négatif | « Ce n'est pas un outil, c'est une révolution. » | signale |
| Formules de remplissage | « Il est important de noter que... » | supprime, remet la majuscule |
| Mots surutilisés | incontournable, pierre angulaire, s'avère être | signale, remplace les cas sûrs |
| Restes de chatbot | « Bien sûr ! », « J'espère que cela vous aide ! » | supprime ou signale |
| Grandiloquence | « change la donne », « joue un rôle crucial », « plongeons dans » | signale |
| Mise en forme de chatbot | emojis en puces, listes de **Libellé gras :** | supprime les emojis, signale les listes |

<!-- slopfix-enable -->

slopfix est déterministe. Il n'appelle aucun LLM, ne devine pas qui a écrit le texte et n'envoie rien nulle part. Il montre les tics, donne à chaque fichier un **score de slop** de 0 (propre) à 100 (pur slop), et corrige ce qui peut l'être sans risque.

## Utilisation

```bash
npx slopfix docs/                  # analyser un dossier
npx slopfix article.md --fix       # corriger le fichier
npx slopfix . --max-score 20       # échouer seulement au-dessus de 20
npx slopfix . --lang fr            # forcer le français
```

La langue est détectée automatiquement pour chaque fichier. Les blocs de code, le code inline, les URLs, le HTML et le front matter sont ignorés.

Configuration, GitHub Action, pre-commit et API : tout est dans le [README anglais](README.md).

## Contribuer

Ajouter une expression française, c'est une ligne dans [`src/rules/fr.js`](src/rules/fr.js). Vous voyez passer un tic IA tous les jours sur LinkedIn ? Ouvrez une pull request. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT
