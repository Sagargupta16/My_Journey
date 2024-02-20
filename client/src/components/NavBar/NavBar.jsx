import { useEffect, useState } from 'react';
import { CgProfile } from 'react-icons/cg';
import { FaHome, FaSignInAlt } from 'react-icons/fa';
import { PiSignOutBold } from 'react-icons/pi';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { checkToken } from '../../api/tokenCheckApi';
import Modal from '../Modal/Modal';
import classes from './Navbar.module.css';

const NavBar = () => {
	const [navItems, setNavItems] = useState([]);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const navigate = useNavigate();
	const token = localStorage.getItem('token');

	useEffect(() => {
		if (token) {
			try {
				checkToken().then((response) => {
					if (response.data.isAuthenticated) setIsAuthenticated(true);
					else setIsAuthenticated(false);
				});
			} catch (error) {
				localStorage.removeItem('token');
				console.error('Error checking token:', error);
				setIsAuthenticated(false);
			}
		} else setIsAuthenticated(false);
	}, [token]);

	useEffect(() => {
		const fixedItems = [
			{
				to: '/',
				label: 'Home',
				icon: <FaHome />
			}
		];

		if (isAuthenticated) {
			setNavItems([
				...fixedItems,
				{
					to: 'profile',
					label: 'Profile',
					icon: <CgProfile />
				}
			]);
		} else {
			setNavItems([
				...fixedItems,
				{
					to: 'auth?mode=signin',
					label: 'Auth',
					icon: <FaSignInAlt />
				}
			]);
		}
	}, [isAuthenticated]);

	const [isModalOpen, setIsModalOpen] = useState(false);

	const onSignOutClick = () => {
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const onConfirmSignOut = () => {
		localStorage.removeItem('token');
		navigate('/auth');
		closeModal();
	};

	return (
		<div className={classes.page}>
			<nav className={classes.nav}>
				<NavLink to="/" aria-label="Home" className={classes['nav__logo']}>
					<span>My Journey</span>
				</NavLink>
				<div className={classes['nav__list']}>
					{navItems.map((item) => (
						<NavLink to={item.to} className={({ isActive }) => (isActive ? classes.active : undefined)} aria-label={item.label} key={item.to}>
							{item.icon} <span>{item.label}</span>
						</NavLink>
					))}
				</div>
				{isAuthenticated && (
					<button className={classes['nav__signout']} aria-label="Sign Out" onClick={onSignOutClick}>
						<PiSignOutBold /> <span>Sign Out</span>
					</button>
				)}
			</nav>
			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				onConfirm={onConfirmSignOut}
				message="Are you sure you want to sign out?"
				buttonTitle="Sign Out"
			/>
			<Outlet />
		</div>
	);
};

export default NavBar;
