//! # Access Control Pallet
//!
//! Controls which nodes/accounts are authorized to update IP threat statuses.
//! Only authorized AI monitoring systems can flag IPs or update threat levels.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;
	use frame_support::weights::Weight;
	use sp_std::vec::Vec;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
	}

	/// Authorized nodes that can update threat status
	#[pallet::storage]
	#[pallet::getter(fn authorized_nodes)]
	pub type AuthorizedNodes<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		bool,
		ValueQuery,
	>;

	/// Admin accounts that can manage authorized nodes
	#[pallet::storage]
	#[pallet::getter(fn admins)]
	pub type Admins<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		bool,
		ValueQuery,
	>;

	#[pallet::genesis_config]
	pub struct GenesisConfig<T: Config> {
		pub initial_admins: Vec<T::AccountId>,
		pub initial_authorized_nodes: Vec<T::AccountId>,
	}

	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self {
				initial_admins: Vec::new(),
				initial_authorized_nodes: Vec::new(),
			}
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			for admin in &self.initial_admins {
				Admins::<T>::insert(admin, true);
			}
			for node in &self.initial_authorized_nodes {
				AuthorizedNodes::<T>::insert(node, true);
			}
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Node added to authorized list
		NodeAuthorized { account: T::AccountId },
		
		/// Node removed from authorized list
		NodeDeauthorized { account: T::AccountId },
		
		/// Admin added
		AdminAdded { account: T::AccountId },
		
		/// Admin removed
		AdminRemoved { account: T::AccountId },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Not an admin
		NotAdmin,
		
		/// Node already authorized
		AlreadyAuthorized,
		
		/// Node not authorized
		NotAuthorized,
		
		/// Admin already exists
		AdminAlreadyExists,
		
		/// Admin not found
		AdminNotFound,
		
		/// Cannot remove last admin
		CannotRemoveLastAdmin,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Add a node to the authorized list (admin or root only)
		#[pallet::call_index(0)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn authorize_node(
			origin: OriginFor<T>,
			account: T::AccountId,
		) -> DispatchResult {
			// Check if root or admin
			if ensure_root(origin.clone()).is_ok() {
				// Root can always authorize
			} else {
				let who = ensure_signed(origin)?;
				ensure!(Admins::<T>::get(&who), Error::<T>::NotAdmin);
			}

			ensure!(!AuthorizedNodes::<T>::get(&account), Error::<T>::AlreadyAuthorized);

			AuthorizedNodes::<T>::insert(&account, true);

			Self::deposit_event(Event::NodeAuthorized { account });

			Ok(())
		}

		/// Remove a node from the authorized list
		#[pallet::call_index(1)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn deauthorize_node(
			origin: OriginFor<T>,
			account: T::AccountId,
		) -> DispatchResult {
			// Check if root or admin
			if ensure_root(origin.clone()).is_ok() {
				// Root can always deauthorize
			} else {
				let who = ensure_signed(origin)?;
				ensure!(Admins::<T>::get(&who), Error::<T>::NotAdmin);
			}

			ensure!(AuthorizedNodes::<T>::get(&account), Error::<T>::NotAuthorized);

			AuthorizedNodes::<T>::remove(&account);

			Self::deposit_event(Event::NodeDeauthorized { account });

			Ok(())
		}

		/// Add an admin account (root only)
		#[pallet::call_index(2)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn add_admin(
			origin: OriginFor<T>,
			account: T::AccountId,
		) -> DispatchResult {
			ensure_root(origin)?;

			ensure!(!Admins::<T>::get(&account), Error::<T>::AdminAlreadyExists);

			Admins::<T>::insert(&account, true);

			Self::deposit_event(Event::AdminAdded { account });

			Ok(())
		}

		/// Remove an admin account (root only)
		#[pallet::call_index(3)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn remove_admin(
			origin: OriginFor<T>,
			account: T::AccountId,
		) -> DispatchResult {
			ensure_root(origin)?;

			ensure!(Admins::<T>::get(&account), Error::<T>::AdminNotFound);

			Admins::<T>::remove(&account);

			Self::deposit_event(Event::AdminRemoved { account });

			Ok(())
		}
	}

	// Helper functions
	impl<T: Config> Pallet<T> {
		/// Check if account is authorized
		pub fn is_authorized(account: &T::AccountId) -> bool {
			AuthorizedNodes::<T>::get(account)
		}

		/// Check if account is admin
		pub fn is_admin(account: &T::AccountId) -> bool {
			Admins::<T>::get(account)
		}
	}
}
