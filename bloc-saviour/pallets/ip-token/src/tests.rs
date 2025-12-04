use crate::{mock::*, Error, Event, ThreatLevel, AttackType, BulkUpdateEntry};
use frame_support::{assert_noop, assert_ok};

#[test]
fn test_mint_ip_token() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		// Mint a new IP token
		let ip = 0xC0A80101; // 192.168.1.1
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));

		// Verify token was created
		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.ip_address, ip);
		assert_eq!(token.first_seen, 1);
		assert_eq!(token.token_id, 0);
		assert_eq!(token.threat_level, ThreatLevel::Unknown);
		assert!(!token.is_malicious);

		// Verify counters
		assert_eq!(IpToken::total_tokens(), 1);
		assert_eq!(IpToken::next_token_id(), 1);

		// Try to mint same IP again - should fail
		assert_noop!(
			IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip),
			Error::<Test>::TokenAlreadyExists
		);
	});
}

#[test]
fn test_update_threat_status() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101; // 192.168.1.1
		
		// Mint token
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));

		// Update to malicious
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			95,
			Some(AttackType::SynFlood),
		));

		// Verify update
		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.threat_level, ThreatLevel::Malicious);
		assert!(token.is_malicious);
		assert_eq!(token.confidence_score, 95);
		assert_eq!(token.flagged_count, 1);
		assert_eq!(token.attack_types.len(), 1);
		assert_eq!(token.attack_types[0], AttackType::SynFlood);
		assert_eq!(token.history.len(), 1);

		// Verify malicious count
		assert_eq!(IpToken::malicious_count(), 1);
	});
}

#[test]
fn test_auto_mint_on_update() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101; // 192.168.1.1
		
		// Update without minting first - should auto-mint
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Suspicious,
			60,
			None,
		));

		// Verify token exists
		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.ip_address, ip);
		assert_eq!(token.threat_level, ThreatLevel::Suspicious);
	});
}

#[test]
fn test_bulk_update() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		// Create bulk update entries
		let updates = vec![
			BulkUpdateEntry {
				ip_address: 0xC0A80101,
				threat_level: ThreatLevel::Malicious,
				confidence: 90,
				attack_type: Some(AttackType::Botnet),
			},
			BulkUpdateEntry {
				ip_address: 0xC0A80102,
				threat_level: ThreatLevel::Malicious,
				confidence: 85,
				attack_type: Some(AttackType::Botnet),
			},
			BulkUpdateEntry {
				ip_address: 0xC0A80103,
				threat_level: ThreatLevel::Malicious,
				confidence: 80,
				attack_type: Some(AttackType::Botnet),
			},
		];

		// Execute bulk update
		assert_ok!(IpToken::bulk_update_threats(RuntimeOrigin::signed(1), updates));

		// Verify all IPs were updated
		assert!(IpToken::ip_tokens(0xC0A80101).is_some());
		assert!(IpToken::ip_tokens(0xC0A80102).is_some());
		assert!(IpToken::ip_tokens(0xC0A80103).is_some());

		// Verify malicious count
		assert_eq!(IpToken::malicious_count(), 3);
	});
}

#[test]
fn test_whitelist() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101; // 192.168.1.1

		// Add to whitelist (requires root)
		assert_ok!(IpToken::add_to_whitelist(RuntimeOrigin::root(), ip));

		// Verify whitelisted
		assert!(IpToken::is_whitelisted(ip));

		// Try to update threat status - should fail
		assert_noop!(
			IpToken::update_threat_status(
				RuntimeOrigin::signed(1),
				ip,
				ThreatLevel::Malicious,
				90,
				None,
			),
			Error::<Test>::IpWhitelisted
		);

		// Remove from whitelist
		assert_ok!(IpToken::remove_from_whitelist(RuntimeOrigin::root(), ip));
		assert!(!IpToken::is_whitelisted(ip));

		// Now update should work
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			90,
			None,
		));
	});
}

#[test]
fn test_rehabilitate_ip() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101;

		// Mint and flag as malicious
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			90,
			None,
		));

		assert_eq!(IpToken::malicious_count(), 1);

		// Rehabilitate
		assert_ok!(IpToken::rehabilitate_ip(RuntimeOrigin::signed(1), ip));

		// Verify
		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.threat_level, ThreatLevel::Rehabilitated);
		assert!(!token.is_malicious);
		assert_eq!(token.confidence_score, 100);
		assert_eq!(IpToken::malicious_count(), 0);
	});
}

#[test]
fn test_invalid_confidence() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101;

		// Try to update with invalid confidence (>100)
		assert_noop!(
			IpToken::update_threat_status(
				RuntimeOrigin::signed(1),
				ip,
				ThreatLevel::Malicious,
				101,
				None,
			),
			Error::<Test>::InvalidConfidence
		);
	});
}

#[test]
fn test_history_tracking() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101;
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));

		// Update status multiple times
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Suspicious,
			50,
			None,
		));

		System::set_block_number(2);
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			90,
			None,
		));

		System::set_block_number(3);
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Clean,
			95,
			None,
		));

		// Verify history
		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.history.len(), 3);
		assert_eq!(token.history[0].block_number, 1);
		assert_eq!(token.history[1].block_number, 2);
		assert_eq!(token.history[2].block_number, 3);
	});
}

#[test]
fn test_attack_types() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101;
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));

		// Add multiple attack types
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			90,
			Some(AttackType::SynFlood),
		));

		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			ip,
			ThreatLevel::Malicious,
			95,
			Some(AttackType::UdpFlood),
		));

		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.attack_types.len(), 2);
		assert!(token.attack_types.contains(&AttackType::SynFlood));
		assert!(token.attack_types.contains(&AttackType::UdpFlood));
	});
}

#[test]
fn test_false_positive_tracking() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		let ip = 0xC0A80101;
		assert_ok!(IpToken::mint_ip_token(RuntimeOrigin::signed(1), ip));

		// Mark as false positive
		assert_ok!(IpToken::mark_false_positive(RuntimeOrigin::signed(1), ip));

		let token = IpToken::ip_tokens(ip).unwrap();
		assert_eq!(token.false_positive_count, 1);
	});
}

#[test]
fn test_malicious_counter() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);

		// Flag multiple IPs as malicious
		for i in 1..=5 {
			assert_ok!(IpToken::update_threat_status(
				RuntimeOrigin::signed(1),
				0xC0A80100 + i,
				ThreatLevel::Malicious,
				90,
				None,
			));
		}

		assert_eq!(IpToken::malicious_count(), 5);

		// Rehabilitate one
		assert_ok!(IpToken::rehabilitate_ip(RuntimeOrigin::signed(1), 0xC0A80101));
		assert_eq!(IpToken::malicious_count(), 4);

		// Update one to clean
		assert_ok!(IpToken::update_threat_status(
			RuntimeOrigin::signed(1),
			0xC0A80102,
			ThreatLevel::Clean,
			100,
			None,
		));
		assert_eq!(IpToken::malicious_count(), 3);
	});
}
