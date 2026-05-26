import { initComposer } from './views/composer.js';
import { initNodesList, refreshFleetMeta } from './views/nodes-list.js';
import { initChipJumps } from './views/nodes-switcher.js';
import { initSession } from './views/session.js';

initSession();
initComposer();
initNodesList();
initChipJumps();
// Prime fleet counts so the rail toggle shows correct numbers even
// before the user enters the Nodes view.
refreshFleetMeta();
