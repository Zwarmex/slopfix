// Writes the sample files in this folder. They are generated so that the repository
// itself never contains a literal em dash: run `node examples/make-examples.js`.
import { writeFileSync } from 'node:fs';

const D = '\u2014';

const en = `# Introducing FlowSync

Certainly! Here's a comprehensive overview of FlowSync.

In today's fast-paced world, teams need tools that just work. It's important to note that FlowSync is not just another productivity app, it's a complete rethink of how teams collaborate.

Built on a robust, cutting-edge architecture ${D} and designed with meticulous attention to detail ${D} FlowSync lets you delve into your data and utilize every insight. Whether you're a seasoned engineer or a first-time founder, FlowSync is a game-changer.

## Key features

- \u{1F680} **Speed:** Seamlessly syncs in real time.
- \u{1F512} **Security:** Enterprise-grade protection.
- \u{1F4A1} **Insights:** Unlock the full potential of your team.

In conclusion, FlowSync stands as a testament to what modern software can be. I hope this helps! Let me know if you have any questions.
`;

const fr = `# Découvrez FlowSync

Bien sûr ! Voici un aperçu complet de FlowSync.

Dans un monde en constante évolution, les équipes ont besoin d'outils fiables. Il est important de noter que FlowSync n'est pas une simple application, c'est une véritable révolution.

Pensé comme un outil incontournable ${D} et conçu avec une attention méticuleuse ${D} FlowSync joue un rôle crucial dans votre productivité. Que vous soyez développeur ou fondateur, FlowSync change la donne.

Plongeons dans les fonctionnalités.

En conclusion, FlowSync s'avère être la pierre angulaire de votre stack. J'espère que cela vous aide ! N'hésitez pas si vous avez d'autres questions.
`;

writeFileSync(new URL('./slop.en.md', import.meta.url), en);
writeFileSync(new URL('./slop.fr.md', import.meta.url), fr);
console.log('Wrote examples/slop.en.md and examples/slop.fr.md');
