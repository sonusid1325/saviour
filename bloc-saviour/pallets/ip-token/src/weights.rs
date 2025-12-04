use frame_support::weights::Weight;

pub trait WeightInfo {
	fn mint_ip_token() -> Weight;
	fn update_threat_status() -> Weight;
	fn bulk_update_threats(n: u32) -> Weight;
	fn rehabilitate_ip() -> Weight;
	fn add_to_whitelist() -> Weight;
	fn remove_from_whitelist() -> Weight;
	fn mark_false_positive() -> Weight;
}

impl WeightInfo for () {
	fn mint_ip_token() -> Weight {
		Weight::from_parts(10_000_000, 0)
			.saturating_add(Weight::from_parts(0, 3000))
	}

	fn update_threat_status() -> Weight {
		Weight::from_parts(20_000_000, 0)
			.saturating_add(Weight::from_parts(0, 3000))
	}

	fn bulk_update_threats(n: u32) -> Weight {
		Weight::from_parts(10_000_000, 0)
			.saturating_add(Weight::from_parts(15_000_000, 0).saturating_mul(n as u64))
			.saturating_add(Weight::from_parts(0, 3000).saturating_mul(n as u64))
	}

	fn rehabilitate_ip() -> Weight {
		Weight::from_parts(15_000_000, 0)
			.saturating_add(Weight::from_parts(0, 3000))
	}

	fn add_to_whitelist() -> Weight {
		Weight::from_parts(10_000_000, 0)
			.saturating_add(Weight::from_parts(0, 100))
	}

	fn remove_from_whitelist() -> Weight {
		Weight::from_parts(8_000_000, 0)
			.saturating_add(Weight::from_parts(0, 100))
	}

	fn mark_false_positive() -> Weight {
		Weight::from_parts(12_000_000, 0)
			.saturating_add(Weight::from_parts(0, 3000))
	}
}
