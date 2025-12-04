#![cfg(feature = "runtime-benchmarks")]

use super::*;
use frame_benchmarking::v2::*;
use frame_support::traits::Currency;
use frame_system::RawOrigin;

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn mint_ip_token() {
		let caller: T::AccountId = whitelisted_caller();
		let ip: u32 = 0xC0A80101;

		#[extrinsic_call]
		mint_ip_token(RawOrigin::Signed(caller), ip);

		assert!(IpTokens::<T>::contains_key(ip));
	}

	#[benchmark]
	fn update_threat_status() {
		let caller: T::AccountId = whitelisted_caller();
		let ip: u32 = 0xC0A80101;

		Pallet::<T>::mint_ip_token(RawOrigin::Signed(caller.clone()).into(), ip).unwrap();

		#[extrinsic_call]
		update_threat_status(
			RawOrigin::Signed(caller),
			ip,
			ThreatLevel::Malicious,
			90,
			Some(AttackType::SynFlood),
		);

		let token = IpTokens::<T>::get(ip).unwrap();
		assert_eq!(token.threat_level, ThreatLevel::Malicious);
	}

	#[benchmark]
	fn bulk_update_threats(n: Linear<1, 1000>) {
		let caller: T::AccountId = whitelisted_caller();
		
		let updates: Vec<BulkUpdateEntry> = (0..n)
			.map(|i| BulkUpdateEntry {
				ip_address: 0xC0A80100 + i,
				threat_level: ThreatLevel::Malicious,
				confidence: 90,
				attack_type: Some(AttackType::Botnet),
			})
			.collect();

		#[extrinsic_call]
		bulk_update_threats(RawOrigin::Signed(caller), updates);
	}

	#[benchmark]
	fn rehabilitate_ip() {
		let caller: T::AccountId = whitelisted_caller();
		let ip: u32 = 0xC0A80101;

		Pallet::<T>::mint_ip_token(RawOrigin::Signed(caller.clone()).into(), ip).unwrap();
		Pallet::<T>::update_threat_status(
			RawOrigin::Signed(caller.clone()).into(),
			ip,
			ThreatLevel::Malicious,
			90,
			None,
		).unwrap();

		#[extrinsic_call]
		rehabilitate_ip(RawOrigin::Signed(caller), ip);

		let token = IpTokens::<T>::get(ip).unwrap();
		assert_eq!(token.threat_level, ThreatLevel::Rehabilitated);
	}

	#[benchmark]
	fn add_to_whitelist() {
		let ip: u32 = 0xC0A80101;

		#[extrinsic_call]
		add_to_whitelist(RawOrigin::Root, ip);

		assert!(WhitelistedIps::<T>::get(ip));
	}

	#[benchmark]
	fn remove_from_whitelist() {
		let ip: u32 = 0xC0A80101;
		WhitelistedIps::<T>::insert(ip, true);

		#[extrinsic_call]
		remove_from_whitelist(RawOrigin::Root, ip);

		assert!(!WhitelistedIps::<T>::get(ip));
	}

	#[benchmark]
	fn mark_false_positive() {
		let caller: T::AccountId = whitelisted_caller();
		let ip: u32 = 0xC0A80101;

		Pallet::<T>::mint_ip_token(RawOrigin::Signed(caller.clone()).into(), ip).unwrap();

		#[extrinsic_call]
		mark_false_positive(RawOrigin::Signed(caller), ip);

		let token = IpTokens::<T>::get(ip).unwrap();
		assert_eq!(token.false_positive_count, 1);
	}

	impl_benchmark_test_suite!(Pallet, crate::mock::new_test_ext(), crate::mock::Test);
}
