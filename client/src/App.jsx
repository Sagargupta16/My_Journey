import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NavBar from './components/NavBar/NavBar';
import NotFound from './components/NotFound/NotFound';
import Authentication from './pages/Auth/Authentication';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import { checkAuthAction, getAuthToken } from './utils/auth';

const App = () => {
	const router = createBrowserRouter([
		{
			path: '/',
			element: <NavBar />,
			id: 'root',
			loader: getAuthToken,
			children: [
				{
					index: true,
					element: <Home />
				},
				{
					path: 'profile',
					element: <Profile />,
					loader: checkAuthAction
				},
				{
					path: 'auth',
					element: <Authentication />
				}
			]
		},
		{
			path: '*',
			element: <NotFound />
		}
	]);

	return (
		<>
			<RouterProvider router={router} className="App" />
			<ToastContainer
				position="bottom-right"
				autoClose={2500}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</>
	);
};

export default App;
