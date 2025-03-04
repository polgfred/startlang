import Home from './home.jsx';
import Providers from './providers.jsx';

export const metadata = {
  title: 'Home',
};

export default function Root() {
  return (
    <Providers>
      <Home />
    </Providers>
  );
}
