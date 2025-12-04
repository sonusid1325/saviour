//! # IP Token Pallet
//!
//! A pallet for managing IP addresses as NFT-like tokens for DDoS prevention and threat tracking.
//!
//! ## Overview
//!
//! This pallet provides functionality to:
//! - Mint IP tokens on-demand (lazy minting)
//! - Update threat status and confidence scores
//! - Track attack types and history
//! - Bulk update operations for botnet detection
//! - Whitelist management for known-good IPs
//!
//! Each IP token contains immutable data (IP address, creation time) and mutable metadata
//! (threat level, attack types, confidence scores, flagging history).

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub mod weights;
pub use weights::*;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;
	use sp_std::vec::Vec;

	pub const MAX_ATTACK_TYPES: u32 = 10;
	pub const MAX_HISTORY_SIZE: u32 = 10;
	pub const MAX_BULK_UPDATE: u32 = 10_000;

	/// Threat level classification for IP addresses
	#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
	pub enum ThreatLevel {
		Unknown,
		Clean,
		Suspicious,
		Malicious,
		Rehabilitated,
	}

	impl Default for ThreatLevel {
		fn default() -> Self {
			ThreatLevel::Unknown
		}
	}

	/// Types of attacks detected
	#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
	pub enum AttackType {
		SynFlood,
		UdpFlood,
		HttpFlood,
		Botnet,
		PortScan,
		DnsAmplification,
		SlowLoris,
		IcmpFlood,
		Smurf,
		Other,
	}

	/// History entry for status changes
	#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
	pub struct HistoryEntry<BlockNumber: Clone + Encode + Decode + MaxEncodedLen> {
		pub block_number: BlockNumber,
		pub old_status: ThreatLevel,
		pub new_status: ThreatLevel,
		pub confidence: u8,
	}

	/// Main IP token data structure
	#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
	#[scale_info(skip_type_params(T))]
	#[codec(mel_bound())]
	pub struct IpTokenData<BlockNumber: Clone + Encode + Decode + MaxEncodedLen> {
		// Immutable fields
		pub ip_address: u32,
		pub first_seen: BlockNumber,
		pub token_id: u64,
		
		// Mutable fields
		pub threat_level: ThreatLevel,
		pub is_malicious: bool,
		pub confidence_score: u8,
		pub attack_types: BoundedVec<AttackType, ConstU32<MAX_ATTACK_TYPES>>,
		pub last_updated: BlockNumber,
		pub flagged_count: u32,
		pub false_positive_count: u32,
		pub history: BoundedVec<HistoryEntry<BlockNumber>, ConstU32<MAX_HISTORY_SIZE>>,
	}

	/// Bulk update entry
	#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo)]
	pub struct BulkUpdateEntry {
		pub ip_address: u32,
		pub threat_level: ThreatLevel,
		pub confidence: u8,
		pub attack_type: Option<AttackType>,
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The overarching runtime event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
		
		/// Weight information for extrinsics
		type WeightInfo: WeightInfo;

		/// Maximum number of IPs that can be updated in a single bulk operation
		#[pallet::constant]
		type MaxBulkUpdate: Get<u32>;

		/// Confidence threshold for auto-flagging (0-100)
		#[pallet::constant]
		type ConfidenceThreshold: Get<u8>;
	}

	/// Storage for IP tokens: IP address -> Token data
	#[pallet::storage]
	#[pallet::getter(fn ip_tokens)]
	pub type IpTokens<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		u32, // IP address as u32
		IpTokenData<BlockNumberFor<T>>,
		OptionQuery,
	>;

	/// Whitelisted IPs that bypass all checks
	#[pallet::storage]
	#[pallet::getter(fn whitelisted_ips)]
	pub type WhitelistedIps<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		u32,
		bool,
		ValueQuery,
	>;

	/// Counter for generating unique token IDs
	#[pallet::storage]
	#[pallet::getter(fn next_token_id)]
	pub type NextTokenId<T: Config> = StorageValue<_, u64, ValueQuery>;

	/// Total count of minted tokens
	#[pallet::storage]
	#[pallet::getter(fn total_tokens)]
	pub type TotalTokens<T: Config> = StorageValue<_, u64, ValueQuery>;

	/// Count of currently malicious IPs
	#[pallet::storage]
	#[pallet::getter(fn malicious_count)]
	pub type MaliciousCount<T: Config> = StorageValue<_, u32, ValueQuery>;

	/// Genesis configuration
	#[pallet::genesis_config]
	pub struct GenesisConfig<T: Config> {
		pub whitelisted_ips: Vec<u32>,
		#[serde(skip)]
		pub _phantom: PhantomData<T>,
	}

	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self {
				whitelisted_ips: Vec::new(),
				_phantom: Default::default(),
			}
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			for ip in &self.whitelisted_ips {
				WhitelistedIps::<T>::insert(ip, true);
			}
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// IP token minted [ip_address, token_id, block_number]
		TokenMinted { ip_address: u32, token_id: u64, block_number: BlockNumberFor<T> },
		
		/// Threat detected [ip_address, threat_level, attack_type]
		ThreatDetected { ip_address: u32, threat_level: ThreatLevel, attack_type: Option<AttackType> },
		
		/// Status updated [ip_address, old_status, new_status, confidence]
		StatusUpdated { ip_address: u32, old_status: ThreatLevel, new_status: ThreatLevel, confidence: u8 },
		
		/// Bulk update completed [count, block_number]
		BulkUpdateCompleted { count: u32, block_number: BlockNumberFor<T> },
		
		/// IP rehabilitated [ip_address]
		IpRehabilitated { ip_address: u32 },
		
		/// IP added to whitelist [ip_address]
		IpWhitelisted { ip_address: u32 },
		
		/// IP removed from whitelist [ip_address]
		IpRemovedFromWhitelist { ip_address: u32 },
		
		/// Attack type added [ip_address, attack_type]
		AttackTypeAdded { ip_address: u32, attack_type: AttackType },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// IP token already exists
		TokenAlreadyExists,
		
		/// IP token not found
		TokenNotFound,
		
		/// IP is whitelisted and cannot be flagged
		IpWhitelisted,
		
		/// Invalid confidence score (must be 0-100)
		InvalidConfidence,
		
		/// Too many attack types
		TooManyAttackTypes,
		
		/// History buffer full
		HistoryBufferFull,
		
		/// Bulk update exceeds maximum size
		BulkUpdateTooLarge,
		
		/// Invalid IP address
		InvalidIpAddress,
		
		/// Arithmetic overflow
		ArithmeticOverflow,
		
		/// Not authorized
		NotAuthorized,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Mint a new IP token (lazy minting - only if doesn't exist)
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address as u32 (e.g., 192.168.1.1 = 3232235777)
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::mint_ip_token())]
		pub fn mint_ip_token(origin: OriginFor<T>, ip_address: u32) -> DispatchResult {
			let _who = ensure_signed(origin)?;

			// Check if token already exists
			ensure!(!IpTokens::<T>::contains_key(ip_address), Error::<T>::TokenAlreadyExists);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let token_id = NextTokenId::<T>::get();

			// Create new token with default values
			let token = IpTokenData {
				ip_address,
				first_seen: current_block,
				token_id,
				threat_level: ThreatLevel::Unknown,
				is_malicious: false,
				confidence_score: 0,
				attack_types: BoundedVec::default(),
				last_updated: current_block,
				flagged_count: 0,
				false_positive_count: 0,
				history: BoundedVec::default(),
			};

			// Store token
			IpTokens::<T>::insert(ip_address, token);

			// Update counters
			NextTokenId::<T>::put(token_id.saturating_add(1));
			TotalTokens::<T>::mutate(|count| *count = count.saturating_add(1));

			Self::deposit_event(Event::TokenMinted {
				ip_address,
				token_id,
				block_number: current_block,
			});

			Ok(())
		}

		/// Update threat status of an IP token
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address to update
		/// - `threat_level`: New threat level
		/// - `confidence`: Confidence score (0-100)
		/// - `attack_type`: Optional attack type to add
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::update_threat_status())]
		pub fn update_threat_status(
			origin: OriginFor<T>,
			ip_address: u32,
			threat_level: ThreatLevel,
			confidence: u8,
			attack_type: Option<AttackType>,
		) -> DispatchResult {
			let _who = ensure_signed(origin)?;

			// Validate confidence score
			ensure!(confidence <= 100, Error::<T>::InvalidConfidence);

			// Check if IP is whitelisted
			ensure!(!WhitelistedIps::<T>::get(ip_address), Error::<T>::IpWhitelisted);

			// Get or create token
			let mut token = if let Some(existing_token) = IpTokens::<T>::get(ip_address) {
				existing_token
			} else {
				// Auto-mint if doesn't exist
				let current_block = <frame_system::Pallet<T>>::block_number();
				let token_id = NextTokenId::<T>::get();

				// Create new token with default values
				let new_token = IpTokenData {
					ip_address,
					first_seen: current_block,
					token_id,
					threat_level: ThreatLevel::Unknown,
					is_malicious: false,
					confidence_score: 0,
					attack_types: BoundedVec::default(),
					last_updated: current_block,
					flagged_count: 0,
					false_positive_count: 0,
					history: BoundedVec::default(),
				};

				// Store token
				IpTokens::<T>::insert(ip_address, new_token.clone());

				// Update counters
				NextTokenId::<T>::put(token_id.saturating_add(1));
				TotalTokens::<T>::mutate(|count| *count = count.saturating_add(1));

				Self::deposit_event(Event::TokenMinted {
					ip_address,
					token_id,
					block_number: current_block,
				});

				new_token
			};

			let old_status = token.threat_level.clone();
			let current_block = <frame_system::Pallet<T>>::block_number();

			// Update threat level
			token.threat_level = threat_level.clone();
			token.confidence_score = confidence;
			token.last_updated = current_block;

			// Update malicious flag
			let was_malicious = token.is_malicious;
			token.is_malicious = matches!(threat_level, ThreatLevel::Malicious);

			// Update malicious counter
			if !was_malicious && token.is_malicious {
				MaliciousCount::<T>::mutate(|count| *count = count.saturating_add(1));
				token.flagged_count = token.flagged_count.saturating_add(1);
			} else if was_malicious && !token.is_malicious {
				MaliciousCount::<T>::mutate(|count| *count = count.saturating_sub(1));
			}

			// Add attack type if provided
			if let Some(attack) = attack_type.clone() {
				if !token.attack_types.contains(&attack) {
					token.attack_types.try_push(attack.clone())
						.map_err(|_| Error::<T>::TooManyAttackTypes)?;
					
					Self::deposit_event(Event::AttackTypeAdded {
						ip_address,
						attack_type: attack,
					});
				}
			}

			// Add to history
			let history_entry = HistoryEntry {
				block_number: current_block,
				old_status: old_status.clone(),
				new_status: threat_level.clone(),
				confidence,
			};

			if token.history.len() >= MAX_HISTORY_SIZE as usize {
				// Remove oldest entry
				token.history.remove(0);
			}
			token.history.try_push(history_entry)
				.map_err(|_| Error::<T>::HistoryBufferFull)?;

			// Store updated token
			IpTokens::<T>::insert(ip_address, token);

			Self::deposit_event(Event::StatusUpdated {
				ip_address,
				old_status,
				new_status: threat_level.clone(),
				confidence,
			});

			if matches!(threat_level, ThreatLevel::Malicious) {
				Self::deposit_event(Event::ThreatDetected {
					ip_address,
					threat_level,
					attack_type,
				});
			}

			Ok(())
		}

		/// Bulk update multiple IPs (for botnet detection)
		/// 
		/// Parameters:
		/// - `updates`: Vector of bulk update entries
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::bulk_update_threats(updates.len() as u32))]
		pub fn bulk_update_threats(
			origin: OriginFor<T>,
			updates: Vec<BulkUpdateEntry>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Check size limit
			ensure!(
				updates.len() <= T::MaxBulkUpdate::get() as usize,
				Error::<T>::BulkUpdateTooLarge
			);

			let current_block = <frame_system::Pallet<T>>::block_number();
			let mut count = 0u32;

			for update in updates {
				// Skip whitelisted IPs
				if WhitelistedIps::<T>::get(update.ip_address) {
					continue;
				}

				// Update each IP
				let result = Self::update_threat_status(
					frame_system::RawOrigin::Signed(who.clone()).into(),
					update.ip_address,
					update.threat_level,
					update.confidence,
					update.attack_type,
				);

				if result.is_ok() {
					count = count.saturating_add(1);
				}
			}

			Self::deposit_event(Event::BulkUpdateCompleted {
				count,
				block_number: current_block,
			});

			Ok(())
		}

		/// Rehabilitate an IP (mark as clean after cool-down)
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address to rehabilitate
		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::rehabilitate_ip())]
		pub fn rehabilitate_ip(origin: OriginFor<T>, ip_address: u32) -> DispatchResult {
			let _who = ensure_signed(origin)?;

			IpTokens::<T>::try_mutate(ip_address, |token_opt| -> DispatchResult {
				let token = token_opt.as_mut().ok_or(Error::<T>::TokenNotFound)?;

				let old_status = token.threat_level.clone();
				token.threat_level = ThreatLevel::Rehabilitated;
				token.is_malicious = false;
				token.confidence_score = 100;
				token.last_updated = <frame_system::Pallet<T>>::block_number();

				// Update counter if was malicious
				if matches!(old_status, ThreatLevel::Malicious) {
					MaliciousCount::<T>::mutate(|count| *count = count.saturating_sub(1));
				}

				Self::deposit_event(Event::IpRehabilitated { ip_address });

				Ok(())
			})
		}

		/// Add IP to whitelist
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address to whitelist
		#[pallet::call_index(4)]
		#[pallet::weight(T::WeightInfo::add_to_whitelist())]
		pub fn add_to_whitelist(origin: OriginFor<T>, ip_address: u32) -> DispatchResult {
			ensure_root(origin)?;

			WhitelistedIps::<T>::insert(ip_address, true);

			// If token exists and is malicious, rehabilitate it
			if let Some(mut token) = IpTokens::<T>::get(ip_address) {
				if token.is_malicious {
					token.is_malicious = false;
					token.threat_level = ThreatLevel::Clean;
					MaliciousCount::<T>::mutate(|count| *count = count.saturating_sub(1));
					IpTokens::<T>::insert(ip_address, token);
				}
			}

			Self::deposit_event(Event::IpWhitelisted { ip_address });

			Ok(())
		}

		/// Remove IP from whitelist
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address to remove from whitelist
		#[pallet::call_index(5)]
		#[pallet::weight(T::WeightInfo::remove_from_whitelist())]
		pub fn remove_from_whitelist(origin: OriginFor<T>, ip_address: u32) -> DispatchResult {
			ensure_root(origin)?;

			WhitelistedIps::<T>::remove(ip_address);

			Self::deposit_event(Event::IpRemovedFromWhitelist { ip_address });

			Ok(())
		}

		/// Mark a flagging as false positive
		/// 
		/// Parameters:
		/// - `ip_address`: The IP address
		#[pallet::call_index(6)]
		#[pallet::weight(T::WeightInfo::mark_false_positive())]
		pub fn mark_false_positive(origin: OriginFor<T>, ip_address: u32) -> DispatchResult {
			let _who = ensure_signed(origin)?;

			IpTokens::<T>::try_mutate(ip_address, |token_opt| -> DispatchResult {
				let token = token_opt.as_mut().ok_or(Error::<T>::TokenNotFound)?;

				token.false_positive_count = token.false_positive_count.saturating_add(1);
				token.last_updated = <frame_system::Pallet<T>>::block_number();

				Ok(())
			})
		}
	}

	// Helper functions
	impl<T: Config> Pallet<T> {
		/// Query IP reputation (public helper)
		pub fn query_ip_reputation(ip_address: u32) -> Option<IpTokenData<BlockNumberFor<T>>> {
			IpTokens::<T>::get(ip_address)
		}

		/// Check if IP is whitelisted
		pub fn is_whitelisted(ip_address: u32) -> bool {
			WhitelistedIps::<T>::get(ip_address)
		}

		/// Get malicious IP count
		pub fn get_malicious_count() -> u32 {
			MaliciousCount::<T>::get()
		}
	}
}
