
"""
Travel OS 分层营收测算引擎
支持参数拖拽实时更新所有收入指标
"""

import json

class RevenueEngine:
    def __init__(self, config_path="revenue_config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)

    def calculate_c_end(self, monthly_orders, avg_order_value=None, commission_rate=None):
        cfg = self.config["c_end"]
        avg = avg_order_value or cfg["avg_order_value"]
        rate = commission_rate or cfg["commission_rate"]
        monthly_revenue = monthly_orders * avg * rate
        category_breakdown = {}
        for cat, info in cfg["categories"].items():
            cat_orders = monthly_orders * info["weight"]
            cat_revenue = cat_orders * info["avg_price"] * info["rate"]
            category_breakdown[cat] = {
                "orders": int(cat_orders),
                "revenue_monthly": round(cat_revenue, 2),
                "revenue_yearly": round(cat_revenue * 12, 2)
            }
        return {
            "monthly_orders": monthly_orders,
            "avg_order_value": avg,
            "commission_rate": rate,
            "monthly_revenue": round(monthly_revenue, 2),
            "yearly_revenue": round(monthly_revenue * 12, 2),
            "category_breakdown": category_breakdown,
            "gross_margin": 0.65
        }

    def calculate_b_subscription(self, merchant_counts=None):
        cfg = self.config["b_subscription"]
        counts = merchant_counts or cfg["current_distribution"]
        total = 0
        tier_breakdown = {}
        for tier in cfg["tiers"]:
            count = counts.get(tier["name"], 0)
            revenue = count * tier["price_yearly"]
            total += revenue
            tier_breakdown[tier["name"]] = {
                "count": count,
                "price_yearly": tier["price_yearly"],
                "revenue_yearly": revenue
            }
        return {
            "total_yearly": total,
            "tier_breakdown": tier_breakdown,
            "gross_margin": 0.85
        }

    def calculate_b_api(self, monthly_calls=None):
        cfg = self.config["b_api"]
        calls = monthly_calls or cfg["current_monthly_calls"]
        tiers = cfg["tiers"]
        revenue = 0
        remaining = calls
        t1 = min(remaining, 1000000)
        revenue += t1 * tiers[0]["price_per_1k"] / 1000
        remaining -= t1
        if remaining > 0:
            t2 = min(remaining, 4000000)
            revenue += t2 * tiers[1]["price_per_1k"] / 1000
            remaining -= t2
        if remaining > 0:
            revenue += remaining * tiers[2]["price_per_1k"] / 1000
        return {
            "monthly_calls": calls,
            "monthly_revenue": round(revenue, 2),
            "yearly_revenue": round(revenue * 12, 2),
            "gross_margin": 0.78
        }

    def calculate_embodied(self, yearly_clients=None, api_hours_monthly=None):
        cfg = self.config["embodied_dataset"]
        clients = yearly_clients or cfg["current_clients"]
        api_hours = api_hours_monthly or 2600
        sub_revenue = sum(p["price_yearly"] for p in cfg["packages"]) * clients
        api_revenue = api_hours * cfg["api_price_per_hour"] * 12
        return {
            "dataset_subscription_yearly": sub_revenue,
            "api_revenue_yearly": api_revenue,
            "total_yearly": sub_revenue + api_revenue,
            "gross_margin": 0.72
        }

    def calculate_world_model(self, clients=None, custom_projects=None):
        cfg = self.config["world_model"]
        c = clients or cfg["current_clients"]
        projects = custom_projects or 3
        license_rev = c * cfg["license_fee"]
        subscription = c * cfg["yearly_subscription"]
        custom = projects * cfg["custom_project"]["avg"]
        return {
            "license_revenue": license_rev,
            "subscription_revenue": subscription,
            "custom_project_revenue": custom,
            "total_yearly": license_rev + subscription + custom,
            "gross_margin": 0.68
        }

    def calculate_gov(self, cities=None):
        cfg = self.config["g_gov"]
        c = cities or len(cfg["cities"])
        return {
            "cities_count": c,
            "yearly_revenue": c * cfg["price_yearly"],
            "contract_years": cfg["contract_years"],
            "gross_margin": 0.90
        }

    def full_report(self, params=None):
        p = params or {}
        c_end = self.calculate_c_end(p.get("monthly_orders", 5314), p.get("avg_order_value"), p.get("commission_rate"))
        b_sub = self.calculate_b_subscription(p.get("merchant_counts"))
        b_api = self.calculate_b_api(p.get("monthly_calls"))
        embodied = self.calculate_embodied(p.get("embodied_clients"), p.get("api_hours_monthly"))
        wm = self.calculate_world_model(p.get("wm_clients"), p.get("custom_projects"))
        gov = self.calculate_gov(p.get("gov_cities"))
        total_yearly = (c_end["yearly_revenue"] + b_sub["total_yearly"] + b_api["yearly_revenue"] + embodied["total_yearly"] + wm["total_yearly"] + gov["yearly_revenue"])
        weighted_margin = (c_end["yearly_revenue"] * c_end["gross_margin"] + b_sub["total_yearly"] * b_sub["gross_margin"] + b_api["yearly_revenue"] * b_api["gross_margin"] + embodied["total_yearly"] * embodied["gross_margin"] + wm["total_yearly"] * wm["gross_margin"] + gov["yearly_revenue"] * gov["gross_margin"]) / total_yearly
        return {
            "c_end": c_end,
            "b_subscription": b_sub,
            "b_api": b_api,
            "embodied": embodied,
            "world_model": wm,
            "gov": gov,
            "total_yearly_revenue": round(total_yearly, 2),
            "weighted_gross_margin": round(weighted_margin, 3),
            "revenue_structure": {
                "travel_os_main": c_end["yearly_revenue"] + b_sub["total_yearly"] + b_api["yearly_revenue"],
                "embodied_value": embodied["total_yearly"] + wm["total_yearly"],
                "gov_stable": gov["yearly_revenue"]
            }
        }


if __name__ == "__main__":
    engine = RevenueEngine("/mnt/agents/output/travel_os_data/revenue_config.json")
    report = engine.full_report()
    print("=== Travel OS 营收测算报告 ===")
    print("年度总收入: " + str(round(report['total_yearly_revenue'])))
    print("综合毛利率: " + str(round(report['weighted_gross_margin']*100, 1)) + "%")
