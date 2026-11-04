import PageShell from '../components/PageShell';
import About from '../components/About';
import Events from '../components/Events';
import Notices from '../components/Notices';
import Team from '../components/Team';
import Gallery from '../components/Gallery';
import Achievements from '../components/Achievements';
import Contact from '../components/Contact';
import JoinCommittee from '../components/join/JoinCommittee';
import JoinGeneral from '../components/join/JoinGeneral';
import JoinHub from './JoinHub';
import JoinAmbassador from '../components/join/JoinAmbassador';
import Ambassadors from './Ambassadors';

const page = (Comp, variant) => function Page() { return <PageShell variant={variant}><Comp /></PageShell>; };

export const AboutPage = page(About, 'orbs');
export const EventsPage = page(Events, 'orbs');
export const NoticesPage = page(Notices, 'orbs');
export const TeamPage = page(Team, 'general');
export const GalleryPage = page(Gallery, 'orbs');
export const AchievementsPage = page(Achievements, 'committee');
export const ContactPage = page(Contact, 'orbs');
export const JoinHubPage = JoinHub;
export const JoinCommitteePage = JoinCommittee;
export const JoinGeneralPage = JoinGeneral;
export const JoinAmbassadorPage = JoinAmbassador;
export const AmbassadorsPage = Ambassadors;
