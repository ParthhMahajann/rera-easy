#!/usr/bin/env python3
"""
Test script to verify pricing calculation logic
"""

import json
import sys
from pathlib import Path

# Add the backend directory to path to import services_data
sys.path.append(str(Path(__file__).parent / "backend"))

try:
    from services_data import calculate_enhanced_pricing
except ImportError:
    print("Could not import calculate_enhanced_pricing from services_data.py")
    print("Make sure the backend/services_data.py file exists and is correct")
    sys.exit(1)

def load_pricing_data():
    """Load pricing data from JSON file"""
    try:
        pricing_file = Path(__file__).parent / "backend" / "pricing_data.json"
        with open(pricing_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading pricing data: {e}")
        return {}

def test_plot_area_ranges():
    """Test different plot area ranges"""
    pricing_data = load_pricing_data()
    
    if not pricing_data:
        print("No pricing data loaded!")
        return False
    
    # Test cases with different plot areas
    test_cases = [
        (250, "0-500"),
        (750, "500-2000"), 
        (1500, "500-2000"),
        (3000, "2000-4000"),
        (5000, "4000-6500"),
        (7000, "6500 and above"),
        (10000, "6500 and above")
    ]
    
    # Sample headers for testing
    sample_headers = [
        {
            "header": "Registration Services",
            "services": [
                {
                    "id": "service-project-registration-1",
                    "name": "Project Registration",
                    "label": "Project Registration"
                }
            ]
        }
    ]
    
    print("Testing plot area ranges:")
    print("=" * 50)
    
    for plot_area, expected_band in test_cases:
        print(f"\nTesting plot area: {plot_area} (expected band: {expected_band})")
        
        try:
            result = calculate_enhanced_pricing(
                category="Category 1",
                region="Mumbai City", 
                plot_area=plot_area,
                headers=sample_headers,
                pricing_data=pricing_data
            )
            
            if result["success"]:
                print(f"✓ Success - Calculated pricing for {plot_area} sqft")
                print(f"  Total services: {result['summary']['totalServices']}")
                print(f"  Subtotal: ₹{result['summary']['subtotal']:,.2f}")
                
                if result["breakdown"]:
                    for header in result["breakdown"]:
                        print(f"  Header: {header['header']}")
                        for service in header["services"]:
                            print(f"    - {service['name']}: ₹{service['totalAmount']:,.2f}")
            else:
                print(f"✗ Failed to calculate pricing for {plot_area}")
                
        except Exception as e:
            print(f"✗ Error calculating pricing for {plot_area}: {e}")
    
    return True

def test_different_regions():
    """Test different regions"""
    pricing_data = load_pricing_data()
    
    if not pricing_data:
        return False
    
    regions = ["Mumbai City", "ROM", "Mumbai Suburban", "Navi Mumbai", "Raigad"]
    plot_area = 1000  # Test with 1000 sqft
    
    sample_headers = [
        {
            "header": "Registration Services",
            "services": [
                {
                    "id": "service-project-registration-1",
                    "name": "Project Registration",
                    "label": "Project Registration"
                }
            ]
        }
    ]
    
    print("\n\nTesting different regions:")
    print("=" * 50)
    
    for region in regions:
        print(f"\nTesting region: {region}")
        
        try:
            result = calculate_enhanced_pricing(
                category="Category 1",
                region=region,
                plot_area=plot_area,
                headers=sample_headers,
                pricing_data=pricing_data
            )
            
            if result["success"]:
                print(f"✓ Success - Subtotal: ₹{result['summary']['subtotal']:,.2f}")
            else:
                print(f"✗ Failed to calculate pricing for {region}")
                
        except Exception as e:
            print(f"✗ Error calculating pricing for {region}: {e}")

def test_package_pricing():
    """Test package pricing"""
    pricing_data = load_pricing_data()
    
    if not pricing_data:
        return False
    
    # Test with package headers
    package_headers = [
        {
            "header": "Package A",
            "services": []  # Package services are auto-populated
        }
    ]
    
    print("\n\nTesting package pricing:")
    print("=" * 50)
    
    try:
        result = calculate_enhanced_pricing(
            category="Category 1",
            region="Mumbai City",
            plot_area=1000,
            headers=package_headers,
            pricing_data=pricing_data
        )
        
        if result["success"]:
            print(f"✓ Package A pricing successful")
            print(f"  Subtotal: ₹{result['summary']['subtotal']:,.2f}")
            print(f"  Total services: {result['summary']['totalServices']}")
            
            if result["breakdown"]:
                for header in result["breakdown"]:
                    print(f"  Header: {header['header']}")
                    print(f"  Header Total: ₹{header['headerTotal']:,.2f}")
        else:
            print("✗ Package pricing failed")
            
    except Exception as e:
        print(f"✗ Error testing package pricing: {e}")

def main():
    """Main test function"""
    print("Pricing Calculation Test Suite")
    print("=" * 50)
    
    # Run all tests
    success = True
    
    try:
        success &= test_plot_area_ranges()
        success &= test_different_regions() is not False
        success &= test_package_pricing() is not False
        
        if success:
            print("\n\n✓ All tests completed!")
        else:
            print("\n\n✗ Some tests failed!")
            
    except Exception as e:
        print(f"\n\nError running tests: {e}")
        return False
    
    return success

if __name__ == "__main__":
    main()
