'use client';

// ============================================================================
// ReliefChain: Disaster Relief Resource Allocation & Routing System
// Master Interactive War Room & Command Center
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  Radio,
  Package,
  Truck,
  Building2,
  Terminal,
  Database,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Send,
  Navigation,
  Compass,
  Cpu,
  RefreshCw,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Users
} from 'lucide-react';

export default function ReliefChainApp() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<'ADMIN' | 'LOGISTICS_STAFF' | 'FIRST_RESPONDER'>('ADMIN');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [campsData, setCampsData] = useState<any[]>([]);
  const [deficitsData, setDeficitsData] = useState<any[]>([]);
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [shipmentsData, setShipmentsData] = useState<any[]>([]);
  const [sosSignals, setSosSignals] = useState<any[]>([]);
  const [telemetryData, setTelemetryData] = useState<any>(null);

  // Forms and Modals
  const [sosForm, setSosForm] = useState({
    senderName: '',
    senderPhone: '',
    victimCount: 1,
    message: '',
    zoneId: 1
  });
  const [sosFeedback, setSosFeedback] = useState<any>(null);
  const [vectorQueryText, setVectorQueryText] = useState('');
  const [vectorSearchResults, setVectorSearchResults] = useState<any>(null);
  const [vectorLoading, setVectorLoading] = useState(false);

  // Dispatch Planner Form
  const [dispatchForm, setDispatchForm] = useState({
    requestId: '',
    warehouseId: '',
    vehicleId: '',
    allocatedQty: 100
  });
  const [nearestWarehouses, setNearestWarehouses] = useState<any[]>([]);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);

  // Restock Form
  const [restockForm, setRestockForm] = useState({
    warehouseId: 1,
    categoryId: 1,
    quantity: 500
  });
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null);

  // SQL Lab state
  const [sqlPresets, setSqlPresets] = useState<any[]>([]);
  const [currentSql, setCurrentSql] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  // Notification Banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>({
    text: 'ReliefChain Dual-Paradigm DBMS active: PostgreSQL (Relational + pgvector) & MongoDB (NoSQL telemetry) connected.',
    type: 'info'
  });

  // Initial Data Fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setRefreshing(true);
    try {
      const [dashRes, campsRes, reqRes, invRes, dispRes, sosRes, teleRes, sqlLabRes] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/camps').then(r => r.json()),
        fetch('/api/requests').then(r => r.json()),
        fetch('/api/inventory').then(r => r.json()),
        fetch('/api/dispatch').then(r => r.json()),
        fetch('/api/sos').then(r => r.json()),
        fetch('/api/telemetry').then(r => r.json()),
        fetch('/api/sql-lab').then(r => r.json()),
      ]);

      if (dashRes.success) setDashboardData(dashRes);
      if (campsRes.success) {
        setCampsData(campsRes.camps || []);
        setDeficitsData(campsRes.deficits || []);
      }
      if (reqRes.success) setRequestsData(reqRes.requests || []);
      if (invRes.success) {
        setInventoryData(invRes.inventory || []);
        setWarehousesList(invRes.warehouses || []);
        setCategoriesList(invRes.categories || []);
      }
      if (dispRes.success) {
        setFleetData(dispRes.fleet || []);
        setShipmentsData(dispRes.shipments || []);
      }
      if (sosRes.success) setSosSignals(sosRes.signals || []);
      if (teleRes.success) setTelemetryData(teleRes);
      if (sqlLabRes.success && sqlLabRes.presets) {
        setSqlPresets(sqlLabRes.presets);
        if (sqlLabRes.presets.length > 0) {
          setCurrentSql(sqlLabRes.presets[0].sql);
        }
      }
    } catch (err: any) {
      console.error('Data sync error:', err);
      setBannerMsg({ text: 'Error connecting to database APIs: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Handle SOS Submission
  async function submitSos(e: React.FormEvent) {
    e.preventDefault();
    if (!sosForm.senderName || !sosForm.message) return;
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosForm)
      });
      const data = await res.json();
      if (data.success) {
        setSosFeedback(data);
        setSosForm({ senderName: '', senderPhone: '', victimCount: 1, message: '', zoneId: 1 });
        setBannerMsg({
          text: `SOS Signal Ingested! AI Urgency: ${data.semanticAnalysis.detectedUrgency}. Vector stored with 384 dimensions.`,
          type: 'success'
        });
        fetchAllData();
      } else {
        alert(data.error || 'Failed to submit SOS');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  // Handle Semantic Vector Search
  async function performVectorSearch() {
    if (!vectorQueryText.trim()) return;
    setVectorLoading(true);
    try {
      const res = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: vectorQueryText, limit: 5 })
      });
      const data = await res.json();
      if (data.success) {
        setVectorSearchResults(data);
      } else {
        alert(data.error || 'Vector search failed');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setVectorLoading(false);
    }
  }

  // Find Nearest Warehouse when Request selected in Dispatch Planner
  async function handleRequestSelect(reqId: string) {
    setDispatchForm(prev => ({ ...prev, requestId: reqId }));
    const selected = requestsData.find(r => r.id.toString() === reqId);
    if (selected) {
      setDispatchForm(prev => ({ ...prev, allocatedQty: selected.requested_quantity }));
      try {
        const res = await fetch(`/api/dispatch?campId=${selected.camp_id}&categoryId=${selected.category_id}&requiredQty=1`);
        const data = await res.json();
        if (data.success && data.nearestWarehouses) {
          setNearestWarehouses(data.nearestWarehouses);
          if (data.nearestWarehouses.length > 0) {
            setDispatchForm(prev => ({ ...prev, warehouseId: data.nearestWarehouses[0].warehouse_id.toString() }));
          }
        }
      } catch (err) {
        console.error('Nearest warehouse error:', err);
      }
    }
  }

  // Trigger ACID Dispatch Stored Procedure
  async function executeAcidDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatchForm.requestId || !dispatchForm.warehouseId || !dispatchForm.vehicleId) {
      alert('Please select request, warehouse, and vehicle.');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: parseInt(dispatchForm.requestId),
          warehouseId: parseInt(dispatchForm.warehouseId),
          vehicleId: parseInt(dispatchForm.vehicleId),
          allocatedQty: parseInt(dispatchForm.allocatedQty.toString()),
          dispatchedBy: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setDispatchResult(data);
        setBannerMsg({
          text: `ACID Dispatch Transaction Succeeded! Tracking: ${data.trackingCode}. Stock deducted & vehicle dispatched atomically.`,
          type: 'success'
        });
        fetchAllData();
      } else {
        alert(`Dispatch Transaction Failed: ${data.details || data.error}`);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setDispatching(false);
    }
  }

  // Mark Shipment Delivered (Fires Database Trigger)
  async function markDelivered(shipmentId: number) {
    try {
      const res = await fetch(`/api/dispatch/${shipmentId}/deliver`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBannerMsg({
          text: `Delivery Confirmed! Trigger 'trg_shipment_delivery' executed: vehicle freed to AVAILABLE and request marked FULFILLED.`,
          type: 'success'
        });
        fetchAllData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  // Warehouse Restock DML
  async function submitRestock(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: parseInt(restockForm.warehouseId.toString()),
          categoryId: parseInt(restockForm.categoryId.toString()),
          restockQuantity: parseInt(restockForm.quantity.toString())
        })
      });
      const data = await res.json();
      if (data.success) {
        setRestockSuccess(`Successfully restocked ${restockForm.quantity} units! Inventory updated in PostgreSQL.`);
        setTimeout(() => setRestockSuccess(null), 4000);
        fetchAllData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  // Execute SQL in SQL Lab
  async function runSql() {
    if (!currentSql.trim()) return;
    setSqlLoading(true);
    setSqlResult(null);
    try {
      const res = await fetch('/api/sql-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: currentSql })
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (err: any) {
      setSqlResult({ error: 'Network failure', details: err.message });
    } finally {
      setSqlLoading(false);
    }
  }

  const kpis = dashboardData?.metrics || {
    active_zones: 3,
    operational_camps: 4,
    total_displaced_sheltered: 2540,
    global_stock_units: 24500,
    available_vehicles: 5,
    active_missions: 1,
    unresolved_sos: 3,
    pending_requests: 4
  };

  return (
    <div className="app-container">
      {/* Top Command Bar */}
      <header className="command-header">
        <div className="brand-section">
          <div className="brand-icon-box">
            <Radio className="text-white" size={24} />
          </div>
          <div>
            <h1 className="brand-title">
              ReliefChain <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level 3</span>
            </h1>
            <p className="brand-subtitle">
              Disaster Relief Resource Allocation & Routing System | SQL + pgvector + MongoDB
            </p>
          </div>
        </div>

        <div className="header-actions">
          <div className="db-status-badge">
            <span className="dot"></span>
            PostgreSQL 16 + pgvector & Mongo 7.0 Active
          </div>

          <div className="role-pill">
            <Users size={16} className="text-cyan-400" />
            <span>Role:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              title="Select Active User Role (RBAC)"
            >
              <option value="ADMIN">ADMIN (Disaster Coordinator)</option>
              <option value="LOGISTICS_STAFF">LOGISTICS_STAFF (Depot & Fleet)</option>
              <option value="FIRST_RESPONDER">FIRST_RESPONDER (Field Officer)</option>
            </select>
          </div>

          <button
            onClick={fetchAllData}
            className="btn btn-secondary btn-sm"
            title="Refresh Database Telemetry"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </header>

      {/* Dynamic Status / Alert Banner */}
      {bannerMsg && (
        <div
          style={{
            background:
              bannerMsg.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : bannerMsg.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(59, 130, 246, 0.12)',
            border: `1px solid ${
              bannerMsg.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : bannerMsg.type === 'error'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(59, 130, 246, 0.3)'
            }`,
            borderRadius: '10px',
            padding: '12px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.86rem',
            color: '#fff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {bannerMsg.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
            {bannerMsg.type === 'error' && <AlertTriangle size={18} className="text-rose-400" />}
            {bannerMsg.type === 'info' && <Radio size={18} className="text-cyan-400" />}
            <span>{bannerMsg.text}</span>
          </div>
          <button
            onClick={() => setBannerMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity size={16} className="tab-icon" />
          War Room Dashboard
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'sos' ? 'active' : ''}`}
          onClick={() => setActiveTab('sos')}
        >
          <Radio size={16} className="tab-icon" />
          Emergency SOS & Vector Triage ({sosSignals.length})
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`}
          onClick={() => setActiveTab('dispatch')}
        >
          <Navigation size={16} className="tab-icon" />
          ACID Dispatch & Routing
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} className="tab-icon" />
          Warehouse Inventory Balancer
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'camps' ? 'active' : ''}`}
          onClick={() => setActiveTab('camps')}
        >
          <Building2 size={16} className="tab-icon" />
          Relief Camps & Deficit Matrix
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          <Compass size={16} className="tab-icon" />
          Drone Telemetry (MongoDB NoSQL)
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'sqllab' ? 'active' : ''}`}
          onClick={() => setActiveTab('sqllab')}
        >
          <Terminal size={16} className="tab-icon" />
          Evaluation SQL Lab
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <FileText size={16} className="tab-icon" />
          Project Architecture & ER Diagram
        </button>
      </nav>

      {/* KPI Stats Ribbon */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Active Crisis Zones</span>
            <ShieldAlert size={18} className="text-rose-400" />
          </div>
          <div className="kpi-value">{kpis.active_zones}</div>
          <span className="kpi-subtext">Cyclone, Flood & Landslide sectors</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Sheltered Displaced Pop</span>
            <Users size={18} className="text-cyan-400" />
          </div>
          <div className="kpi-value">{Number(kpis.total_displaced_sheltered).toLocaleString()}</div>
          <span className="kpi-subtext">Across {kpis.operational_camps} operational camps</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Global Stock Units</span>
            <Package size={18} className="text-emerald-400" />
          </div>
          <div className="kpi-value">{Number(kpis.global_stock_units).toLocaleString()}</div>
          <span className="kpi-subtext">Food, Water, Medical, Shelters</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Unresolved SOS Alerts</span>
            <Radio size={18} className="text-amber-400" />
          </div>
          <div className="kpi-value" style={{ color: '#fbbf24' }}>{kpis.unresolved_sos}</div>
          <span className="kpi-subtext">pgvector AI similarity triaged</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Active Dispatches</span>
            <Truck size={18} className="text-blue-400" />
          </div>
          <div className="kpi-value">{kpis.active_missions}</div>
          <span className="kpi-subtext">{kpis.available_vehicles} vehicles ready in fleet</span>
        </div>
      </section>

      {/* TAB 1: WAR ROOM DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Disaster Zones Overview (from SQL View: v_active_disaster_dashboard) */}
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <ShieldAlert size={20} className="text-rose-400" />
                  Active Disaster Theaters (View: v_active_disaster_dashboard)
                </h2>
                <p className="panel-subtitle">Real-time rollups grouped by regional catastrophe sectors</p>
              </div>
              <span className="badge badge-critical">Live Incident Stream</span>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Zone ID</th>
                    <th>Disaster Zone</th>
                    <th>Catastrophe Type</th>
                    <th>Severity Level</th>
                    <th>Relief Camps</th>
                    <th>Total Capacity</th>
                    <th>Occupancy</th>
                    <th>Shelter Utilization</th>
                    <th>Critical Requests</th>
                    <th>Unresolved SOS</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.disasterZones && dashboardData.disasterZones.length > 0 ? (
                    dashboardData.disasterZones.map((z: any) => (
                      <tr key={z.zone_id}>
                        <td><strong>#{z.zone_id}</strong></td>
                        <td><strong>{z.zone_name}</strong></td>
                        <td>
                          <span className="badge badge-medium">{z.disaster_type}</span>
                        </td>
                        <td>
                          <span className={`badge ${z.severity_level === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                            {z.severity_level}
                          </span>
                        </td>
                        <td>{z.total_camps}</td>
                        <td>{z.total_shelter_capacity}</td>
                        <td>{z.total_sheltered_victims}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, z.shelter_utilization_pct)}%`,
                                  height: '100%',
                                  background: z.shelter_utilization_pct > 85 ? '#ef4444' : '#10b981'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{z.shelter_utilization_pct}%</span>
                          </div>
                        </td>
                        <td>
                          {z.critical_requests_count > 0 ? (
                            <span className="badge badge-critical">{z.critical_requests_count} Critical</span>
                          ) : (
                            <span className="badge badge-success">Clear</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-high">{z.unresolved_sos_count} Pending</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        Loading disaster zone data from PostgreSQL view...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Column Grid: Critical Relief Requests & Audit Trail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
            {/* Critical Relief Requests */}
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">
                    <AlertTriangle size={18} className="text-amber-400" />
                    Critical Supply Demands from Field Camps
                  </h3>
                  <p className="panel-subtitle">Immediate unfulfilled supply requirements</p>
                </div>
                <button
                  onClick={() => setActiveTab('dispatch')}
                  className="btn btn-primary btn-sm"
                >
                  Allocate Stock <ChevronRight size={14} />
                </button>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Camp & Zone</th>
                      <th>Requested Resource</th>
                      <th>Quantity</th>
                      <th>Urgency</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.criticalRequests && dashboardData.criticalRequests.length > 0 ? (
                      dashboardData.criticalRequests.map((req: any) => (
                        <tr key={req.id}>
                          <td>
                            <strong>{req.camp_name}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{req.zone_name}</div>
                          </td>
                          <td>
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{req.resource_name}</span>
                          </td>
                          <td><strong>{req.requested_quantity}</strong> units</td>
                          <td>
                            <span className={`badge ${req.urgency_level === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                              {req.urgency_level}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                handleRequestSelect(req.id.toString());
                                setActiveTab('dispatch');
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Dispatch
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          No pending critical requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Trail (allocation_audit_log) */}
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">
                    <Layers size={18} className="text-indigo-400" />
                    ACID Transaction Audit Trail
                  </h3>
                  <p className="panel-subtitle">Live events written to allocation_audit_log via triggers</p>
                </div>
                <span className="badge badge-medium">DB Trigger Driven</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dashboardData?.recentAudit && dashboardData.recentAudit.length > 0 ? (
                  dashboardData.recentAudit.map((log: any) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(30, 41, 59, 0.45)',
                        borderLeft: `4px solid ${log.action_type === 'DISPATCH_ALLOCATION' ? '#10b981' : '#38bdf8'}`,
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                          {log.action_type} on {log.entity_name} #{log.entity_id}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                        {JSON.stringify(log.new_state)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.86rem' }}>
                    No audit records logged yet. Process a dispatch to generate audit logs!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMERGENCY SOS & VECTOR TRIAGE (pgvector) */}
      {activeTab === 'sos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Explanation of Semantic Vector Search */}
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Sparkles size={20} className="text-cyan-400" />
                  Semantic AI Distress Vector Ingestion & Matching (pgvector 384-dim)
                </h2>
                <p className="panel-subtitle">
                  Converts unstructured victim SOS text into dense mathematical embeddings and matches required relief kits using Cosine Distance (<code style={{ color: '#38bdf8' }}>&lt;=&gt;</code>)
                </p>
              </div>
              <span className="badge badge-success">Vector DB Requirement</span>
            </div>

            {/* Semantic Search Box */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search distress signals semantically (e.g., 'insulin for diabetic seniors', 'infant milk baby formula clean water')..."
                value={vectorQueryText}
                onChange={(e) => setVectorQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performVectorSearch()}
                className="form-input"
                style={{ flex: 1, minWidth: '320px' }}
              />
              <button
                onClick={performVectorSearch}
                disabled={vectorLoading}
                className="btn btn-primary"
              >
                <Search size={16} />
                {vectorLoading ? 'Searching Vectors...' : 'Execute Vector Search'}
              </button>
            </div>

            {/* Vector Search Results Display */}
            {vectorSearchResults && (
              <div style={{ background: 'rgba(3, 7, 18, 0.7)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#38bdf8', fontSize: '0.92rem' }}>
                    Semantic Matches for: &quot;{vectorSearchResults.queryText}&quot; (Similarity Metric: {vectorSearchResults.vectorEngine.similarityMetric})
                  </h4>
                  <span className="badge badge-medium">pgvector Cosine Distance</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                  {vectorSearchResults.matchedSignals.map((match: any) => (
                    <div
                      key={match.id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${match.cosine_similarity > 0.6 ? '#10b981' : '#f59e0b'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{match.sender_name}</span>
                        <span className="badge badge-success">
                          Sim: {(match.cosine_similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px' }}>&quot;{match.raw_message}&quot;</p>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Matched Supply Category: <strong style={{ color: '#38bdf8' }}>{match.matched_category_name}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form and Live SOS Stream Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
            {/* Submit New SOS Form */}
            <div className="glass-panel">
              <h3 className="panel-title" style={{ marginBottom: '16px' }}>
                <Send size={18} className="text-cyan-400" />
                Submit Emergency Distress SOS Signal
              </h3>

              <form onSubmit={submitSos} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Caller / Sender Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Varma"
                      value={sosForm.senderName}
                      onChange={(e) => setSosForm({ ...sosForm, senderName: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91-9876543210"
                      value={sosForm.senderPhone}
                      onChange={(e) => setSosForm({ ...sosForm, senderPhone: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Estimated Victim Count *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={sosForm.victimCount}
                      onChange={(e) => setSosForm({ ...sosForm, victimCount: parseInt(e.target.value) || 1 })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Disaster Sector</label>
                    <select
                      value={sosForm.zoneId}
                      onChange={(e) => setSosForm({ ...sosForm, zoneId: parseInt(e.target.value) })}
                      className="form-select"
                    >
                      <option value={1}>Coastal Sector Alpha (Bay of Bengal)</option>
                      <option value={2}>Cauvery Basin Riverine Flood Zone</option>
                      <option value={3}>Nilgiri Foothills Landslide Sector</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Unstructured Distress Voice/Text Message *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe emergency: e.g., 'Water reached 1st floor roof, 8 trapped including 2 infants with no drinking water or baby milk. Need evacuation boat!'"
                    value={sosForm.message}
                    onChange={(e) => setSosForm({ ...sosForm, message: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <button type="submit" className="btn btn-danger">
                  <Radio size={16} /> Broadcast SOS with Vector Embedding
                </button>
              </form>

              {/* Feedback on Vector Embeddings */}
              {sosFeedback && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px' }}>
                  <h4 style={{ color: '#34d399', fontSize: '0.86rem', marginBottom: '4px' }}>
                    Vector Successfully Stored in PostgreSQL!
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    AI Urgency Detected: <strong>{sosFeedback.semanticAnalysis.detectedUrgency}</strong> | Top Categorical Match: <strong>{sosFeedback.semanticAnalysis.topMatch?.categoryName} ({sosFeedback.semanticAnalysis.topMatch?.confidenceScore}%)</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Active SOS Distress Feed */}
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">
                    <Radio size={18} className="text-rose-400" />
                    Incoming Emergency SOS Stream ({sosSignals.length})
                  </h3>
                  <p className="panel-subtitle">Stored in PostgreSQL with pgvector embeddings</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                {sosSignals.map((sig: any) => (
                  <div
                    key={sig.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>
                        {sig.sender_name} ({sig.victim_count} victims)
                      </span>
                      <span className={`badge ${sig.detected_urgency === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                        {sig.detected_urgency}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                      &quot;{sig.raw_message}&quot;
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>Matched Aid: <strong style={{ color: '#38bdf8' }}>{sig.matched_category_name || 'Standard Emergency Pack'}</strong></span>
                      <span>{new Date(sig.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACID DISPATCH & ROUTING */}
      {activeTab === 'dispatch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Navigation size={20} className="text-cyan-400" />
                  ACID Dispatch Stored Procedure & Haversine Nearest Warehouse Finder
                </h2>
                <p className="panel-subtitle">
                  Executes stored procedure <code style={{ color: '#38bdf8' }}>sp_process_resource_dispatch</code>: Atomically locks inventory row (FOR UPDATE), validates payload capacity, deducts stock, assigns fleet vehicle, and writes audit record in a single ACID transaction.
                </p>
              </div>
              <span className="badge badge-success">ACID Transactions</span>
            </div>

            {/* Interactive Dispatch Planner Form */}
            <form onSubmit={executeAcidDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-grid">
                {/* Select Pending Relief Request */}
                <div className="form-group">
                  <label className="form-label">1. Select Pending Relief Demand *</label>
                  <select
                    value={dispatchForm.requestId}
                    onChange={(e) => handleRequestSelect(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Choose Demand to Fulfill --</option>
                    {requestsData
                      .filter((r) => r.status === 'PENDING' || r.status === 'APPROVED')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          #{r.id} - {r.camp_name} ({r.resource_name}: {r.requested_quantity} units) [{r.urgency_level}]
                        </option>
                      ))}
                  </select>
                </div>

                {/* Warehouse recommendation from Haversine function */}
                <div className="form-group">
                  <label className="form-label">
                    2. Origin Warehouse (Ranked by Haversine Distance) *
                  </label>
                  <select
                    value={dispatchForm.warehouseId}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, warehouseId: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="">-- Select Depot --</option>
                    {nearestWarehouses.length > 0 ? (
                      nearestWarehouses.map((nw: any) => (
                        <option key={nw.warehouse_id} value={nw.warehouse_id}>
                          {nw.warehouse_name} (Dist: {nw.distance_km} km, Stock: {nw.available_stock} units)
                        </option>
                      ))
                    ) : (
                      warehousesList.map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.location_name})
                        </option>
                      ))
                    )}
                  </select>
                  {nearestWarehouses.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}>
                      Closest optimal depot: <strong>{nearestWarehouses[0].warehouse_name} ({nearestWarehouses[0].distance_km} km)</strong>
                    </span>
                  )}
                </div>

                {/* Select Transport Vehicle */}
                <div className="form-group">
                  <label className="form-label">3. Assign Fleet Vehicle *</label>
                  <select
                    value={dispatchForm.vehicleId}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleId: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="">-- Choose Available Vehicle --</option>
                    {fleetData
                      .filter((v) => v.status === 'AVAILABLE')
                      .map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.vehicle_number} - {v.vehicle_type} (Max Payload: {v.max_payload_kg} kg)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">4. Allocated Quantity (Units) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={dispatchForm.allocatedQty}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, allocatedQty: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={dispatching}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                <Truck size={16} />
                {dispatching ? 'Executing ACID Transaction...' : 'Execute ACID Dispatch & Create Mission'}
              </button>
            </form>

            {dispatchResult && (
              <div style={{ marginTop: '18px', padding: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px' }}>
                <h4 style={{ color: '#34d399', fontSize: '0.9rem' }}>ACID Stored Procedure Executed Successfully</h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Generated Tracking Code: <strong style={{ color: '#38bdf8' }}>{dispatchResult.trackingCode}</strong>.
                  Inventory locked with FOR UPDATE, stock decremented, and vehicle transitioned to IN_TRANSIT.
                </p>
              </div>
            )}
          </div>

          {/* Active Dispatch Shipments & Vehicle Readiness */}
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  <Truck size={18} className="text-blue-400" />
                  Active Shipments & Deliveries Tracking
                </h3>
                <p className="panel-subtitle">Demonstrates database trigger execution upon delivery completion</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tracking Code</th>
                    <th>Destination Camp</th>
                    <th>Supply Item</th>
                    <th>Loaded Qty</th>
                    <th>Depot</th>
                    <th>Assigned Vehicle</th>
                    <th>Status</th>
                    <th>Trigger Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentsData.map((s: any) => (
                    <tr key={s.id}>
                      <td><strong style={{ color: '#38bdf8' }}>{s.tracking_code}</strong></td>
                      <td>{s.destination_camp}</td>
                      <td>{s.item_name}</td>
                      <td>{s.quantity_loaded} units</td>
                      <td>{s.warehouse_name}</td>
                      <td>{s.vehicle_number} ({s.vehicle_type})</td>
                      <td>
                        <span className={`badge ${s.delivery_status === 'DELIVERED' ? 'badge-success' : 'badge-high'}`}>
                          {s.delivery_status}
                        </span>
                      </td>
                      <td>
                        {s.delivery_status !== 'DELIVERED' ? (
                          <button
                            onClick={() => markDelivered(s.id)}
                            className="btn btn-secondary btn-sm"
                            title="Fires database trigger trg_shipment_delivery"
                          >
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            Mark Delivered
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Completed &amp; Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WAREHOUSE INVENTORY BALANCER */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Restock Card */}
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Package size={20} className="text-cyan-400" />
                  Restock Emergency Depository (DML UPDATE / INSERT with ON CONFLICT)
                </h2>
                <p className="panel-subtitle">Increases available inventory and records an audit log row</p>
              </div>
            </div>

            <form onSubmit={submitRestock} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                <label className="form-label">Warehouse Depot</label>
                <select
                  value={restockForm.warehouseId}
                  onChange={(e) => setRestockForm({ ...restockForm, warehouseId: parseInt(e.target.value) })}
                  className="form-select"
                >
                  {warehousesList.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.location_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                <label className="form-label">Resource Category</label>
                <select
                  value={restockForm.categoryId}
                  onChange={(e) => setRestockForm({ ...restockForm, categoryId: parseInt(e.target.value) })}
                  className="form-select"
                >
                  {categoriesList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ width: '180px' }}>
                <label className="form-label">Restock Units</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm({ ...restockForm, quantity: parseInt(e.target.value) || 1 })}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <Package size={16} /> Execute Restock
              </button>
            </form>

            {restockSuccess && (
              <div style={{ marginTop: '14px', color: '#34d399', fontSize: '0.84rem' }}>
                ✓ {restockSuccess}
              </div>
            )}
          </div>

          {/* Full Warehouse Inventory Matrix */}
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  <Database size={18} className="text-emerald-400" />
                  Regional Warehouse Inventory Table (warehouse_inventory)
                </h3>
                <p className="panel-subtitle">Available vs reserved items with threshold checks</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Warehouse Depot</th>
                    <th>Resource Code</th>
                    <th>Resource Name</th>
                    <th>Category Group</th>
                    <th>Available Stock</th>
                    <th>Reserved Stock</th>
                    <th>Min Threshold</th>
                    <th>Status</th>
                    <th>Last Restocked</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.map((inv: any) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.warehouse_name}</strong></td>
                      <td><code>{inv.resource_code}</code></td>
                      <td>{inv.resource_name}</td>
                      <td><span className="badge badge-medium">{inv.category_group}</span></td>
                      <td><strong style={{ fontSize: '1rem', color: '#fff' }}>{inv.available_quantity}</strong> {inv.unit_of_measure}</td>
                      <td>{inv.reserved_quantity}</td>
                      <td>{inv.minimum_threshold}</td>
                      <td>
                        <span className={`badge ${
                          inv.stock_status === 'OUT_OF_STOCK'
                            ? 'badge-critical'
                            : inv.stock_status === 'LOW_STOCK'
                            ? 'badge-high'
                            : 'badge-success'
                        }`}>
                          {inv.stock_status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {new Date(inv.last_restocked_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RELIEF CAMPS & DEFICIT MATRIX */}
      {activeTab === 'camps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Camps List with Urgency Priority Score */}
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Building2 size={20} className="text-cyan-400" />
                  Operational Relief Camps & Urgency Priority Scores
                </h2>
                <p className="panel-subtitle">
                  Urgency score generated in PostgreSQL via stored function <code style={{ color: '#38bdf8' }}>fn_calculate_camp_urgency_score(camp_id)</code> combining occupancy ratio, disaster severity, and pending critical demands.
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Camp Name</th>
                    <th>Camp Type</th>
                    <th>Zone & Severity</th>
                    <th>Contact Officer</th>
                    <th>Capacity</th>
                    <th>Occupancy</th>
                    <th>Utilization</th>
                    <th>Urgency Priority Score</th>
                  </tr>
                </thead>
                <tbody>
                  {campsData.map((c: any) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td><span className="badge badge-medium">{c.camp_type}</span></td>
                      <td>
                        {c.zone_name}
                        <div style={{ fontSize: '0.72rem', color: c.severity_level === 'CRITICAL' ? '#fb7185' : '#fbbf24' }}>
                          [{c.severity_level}]
                        </div>
                      </td>
                      <td>{c.contact_person} ({c.contact_phone})</td>
                      <td>{c.capacity}</td>
                      <td>{c.current_occupancy}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, c.occupancy_pct)}%`,
                                height: '100%',
                                background: c.occupancy_pct > 85 ? '#ef4444' : '#10b981'
                              }}
                            />
                          </div>
                          <span>{c.occupancy_pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.urgency_score > 70 ? 'badge-critical' : c.urgency_score > 50 ? 'badge-high' : 'badge-medium'}`}>
                          {c.urgency_score} / 100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Deficit Matrix View (v_camp_deficit_matrix) */}
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  <Layers size={18} className="text-amber-400" />
                  Camp Deficit Matrix (SQL View: v_camp_deficit_matrix)
                </h3>
                <p className="panel-subtitle">Detailed supply deficit calculated by subtracting delivered stock from total requested</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Camp Name</th>
                    <th>Zone</th>
                    <th>Resource Category</th>
                    <th>Category Group</th>
                    <th>Total Demanded</th>
                    <th>Approved</th>
                    <th>In Transit</th>
                    <th>Delivered</th>
                    <th>Outstanding Deficit</th>
                  </tr>
                </thead>
                <tbody>
                  {deficitsData.map((d: any, idx: number) => (
                    <tr key={idx}>
                      <td><strong>{d.camp_name}</strong></td>
                      <td>{d.zone_name}</td>
                      <td>{d.resource_name}</td>
                      <td><span className="badge badge-medium">{d.category_group}</span></td>
                      <td>{d.total_requested}</td>
                      <td>{d.total_approved}</td>
                      <td>{d.in_transit}</td>
                      <td>{d.total_delivered}</td>
                      <td>
                        <strong style={{ color: d.unfulfilled_deficit > 0 ? '#fb7185' : '#34d399' }}>
                          {d.unfulfilled_deficit} {d.unit_of_measure}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DRONE TELEMETRY & MONGODB NOSQL */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Multi-Stage Aggregation Pipeline Card */}
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Compass size={20} className="text-cyan-400" />
                  MongoDB NoSQL Multi-Stage Aggregation Pipeline
                </h2>
                <p className="panel-subtitle">
                  Executes <code style={{ color: '#38bdf8' }}>$match</code> (last 24h) &rarr; <code style={{ color: '#38bdf8' }}>$group</code> (by disaster zone) &rarr; <code style={{ color: '#38bdf8' }}>$project</code> (averages, survivor detections, road blockages) &rarr; <code style={{ color: '#38bdf8' }}>$sort</code> (by hazard descending)
                </p>
              </div>
              <span className="badge badge-success">NoSQL Document Paradigm</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {telemetryData?.aggregationPipeline?.data && telemetryData.aggregationPipeline.data.length > 0 ? (
                telemetryData.aggregationPipeline.data.map((agg: any) => (
                  <div
                    key={agg.zone_id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      padding: '18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ color: '#fff', fontSize: '1rem' }}>{agg.zone_name}</h4>
                      <span className="badge badge-critical">Avg Hazard: {agg.avg_hazard_score}/10</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Submerged Buildings</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f43f5e' }}>{agg.total_submerged_structures}</div>
                      </div>

                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Thermal Survivors</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{agg.total_thermal_survivors}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px' }}>
                      Blocked Transportation Corridors: <strong>{agg.blockage_count} routes obstructed</strong>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8' }}>Loading MongoDB aggregation pipeline data...</p>
              )}
            </div>
          </div>

          {/* Real-time Field Incident Stream Collection */}
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  <Radio size={18} className="text-amber-400" />
                  Real-Time Incident Event Feed (Collection: incident_event_feed)
                </h3>
                <p className="panel-subtitle">Unstructured situational reports from radar, satellite, and ground radio</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {telemetryData?.incidents && telemetryData.incidents.length > 0 ? (
                telemetryData.incidents.map((inc: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(30, 41, 59, 0.45)',
                      padding: '14px',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${inc.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code>{inc.event_code}</code>
                        <span className="badge badge-medium">{inc.category}</span>
                      </div>
                      <span className={`badge ${inc.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                        {inc.severity}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>{inc.headline}</p>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Source: {inc.source} | Payload: {JSON.stringify(inc.raw_payload)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8' }}>No incidents recorded in MongoDB collection.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: EVALUATION SQL LAB */}
      {activeTab === 'sqllab' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Terminal size={20} className="text-cyan-400" />
                  Interactive DBMS Curriculum Evaluation Workbench
                </h2>
                <p className="panel-subtitle">
                  Live execution terminal demonstrating all required Level 3 database syllabus concepts: Multi-Table JOINs, GROUP BY &amp; HAVING, Subqueries, Stored Procedures, Views, and pgvector.
                </p>
              </div>
            </div>

            {/* Presets Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Load Syllabus Demonstration Query:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {sqlPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCurrentSql(preset.sql);
                      setSqlResult(null);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {preset.title.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Editor Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                rows={9}
                value={currentSql}
                onChange={(e) => setCurrentSql(e.target.value)}
                className="sql-terminal"
                style={{ width: '100%', outline: 'none', border: '1px solid rgba(56, 189, 248, 0.3)' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Executes live on PostgreSQL 16 <code style={{ color: '#38bdf8' }}>reliefchain_db</code>
                </span>

                <button
                  onClick={runSql}
                  disabled={sqlLoading}
                  className="btn btn-primary"
                >
                  <Terminal size={16} />
                  {sqlLoading ? 'Executing Query...' : 'Run Query Live'}
                </button>
              </div>
            </div>

            {/* Query Output Display */}
            {sqlResult && (
              <div style={{ marginTop: '20px' }}>
                {sqlResult.error ? (
                  <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5' }}>
                    <strong>Execution Error:</strong> {sqlResult.details || sqlResult.error}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.86rem' }}>
                        ✓ Query Succeeded ({sqlResult.rowCount} rows returned in {sqlResult.executionTimeMs} ms)
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            {sqlResult.fields.map((col: string) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx}>
                              {sqlResult.fields.map((col: string) => (
                                <td key={col} style={{ fontFamily: typeof row[col] === 'number' ? 'monospace' : 'inherit' }}>
                                  {row[col] !== null ? String(row[col]) : <em style={{ color: '#64748b' }}>NULL</em>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: PROJECT ARCHITECTURE & DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel glow-cyan">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <FileText size={20} className="text-cyan-400" />
                  ReliefChain System Architecture & Academic Specification
                </h2>
                <p className="panel-subtitle">PES University DBMS Experiential Learning - Level 3 Project Documentation</p>
              </div>
              <span className="badge badge-success">Soft Copy Summary</span>
            </div>

            {/* Team Roles Matrix */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', color: '#38bdf8', marginBottom: '8px' }}>
                Team Formation & Responsibilities (2 Members)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem' }}>Member 1: Database Architect &amp; Core Backend</h4>
                  <ul style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', paddingLeft: '16px', lineHeight: 1.6 }}>
                    <li>Relational schema design (3NF), DDL scripts, constraints, CHECK rules</li>
                    <li>ACID Stored Procedure <code style={{ color: '#38bdf8' }}>sp_process_resource_dispatch</code> with FOR UPDATE row locks</li>
                    <li>Geospatial Haversine Stored Function <code style={{ color: '#38bdf8' }}>fn_find_nearest_warehouse_with_stock</code></li>
                    <li>Database triggers: negative inventory prevention &amp; audit logging</li>
                    <li>Analytical Views: Deficit matrix, Fleet readiness, Urgent requests</li>
                  </ul>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem' }}>Member 2: Full-Stack Engineer &amp; Vector/NoSQL Specialist</h4>
                  <ul style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', paddingLeft: '16px', lineHeight: 1.6 }}>
                    <li>pgvector 384-dimensional dense semantic embedding engine &amp; Cosine distance search</li>
                    <li>MongoDB NoSQL document store setup, index creation, and Multi-Stage Aggregation Pipeline</li>
                    <li>Next.js functional UI/UX War Room dashboard, dynamic forms, tables, and tab routing</li>
                    <li>JWT authentication with bcrypt password hashing and Role-Based Access Control (RBAC)</li>
                    <li>Automated seed script &amp; comprehensive test suite execution</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Database Paradigm Justification */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <h4 style={{ color: '#38bdf8', fontSize: '0.88rem', marginBottom: '4px' }}>1. PostgreSQL (Relational SQL)</h4>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Enforces strict ACID compliance, referential integrity (foreign keys), inventory balance constraints, row-level locking during dispatch, and complex analytical views across disaster zones, camps, and warehouses.
                </p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <h4 style={{ color: '#34d399', fontSize: '0.88rem', marginBottom: '4px' }}>2. pgvector (Vector Database)</h4>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Converts unstructured victim SOS distress notes into 384-dimensional dense vectors. Enables rapid Cosine Similarity matching (<code style={{ color: '#38bdf8' }}>&lt;=&gt;</code>) using HNSW indexing to instantly match medical and food kits to desperate calls.
                </p>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '0.88rem', marginBottom: '4px' }}>3. MongoDB (NoSQL Document Store)</h4>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Stores high-velocity, polymorphic IoT drone telemetry, thermal camera sensor detections, and situational event feeds without requiring schema migrations. Leverages an aggregation pipeline for rapid aerial damage assessment.
                </p>
              </div>
            </div>

            {/* Relational Schema Text Blueprint */}
            <div>
              <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>
                Relational Schema Specification (3NF Normalized)
              </h3>
              <pre className="sql-terminal" style={{ fontSize: '0.78rem' }}>
{`USERS (id [PK], email [UQ], password_hash, full_name, role, phone, assigned_zone_id [FK->DISASTER_ZONES])
DISASTER_ZONES (id [PK], name, disaster_type, severity_level, latitude, longitude, radius_km, status)
RELIEF_CAMPS (id [PK], zone_id [FK->DISASTER_ZONES], name, camp_type, contact_person, capacity, current_occupancy, status)
WAREHOUSES (id [PK], name, location_name, latitude, longitude, capacity_sqft, manager_id [FK->USERS], is_operational)
RESOURCE_CATEGORIES (id [PK], code [UQ], name, category_group, unit_of_measure, is_perishable, priority_rank)
WAREHOUSE_INVENTORY (id [PK], warehouse_id [FK], category_id [FK], available_quantity, reserved_quantity, min_threshold)
RELIEF_REQUESTS (id [PK], camp_id [FK], category_id [FK], requested_quantity, approved_quantity, urgency_level, status)
EMERGENCY_SOS_SIGNALS (id [PK], zone_id [FK], sender_name, latitude, longitude, victim_count, raw_message, embedding [vector(384)])
VEHICLE_FLEET (id [PK], vehicle_number [UQ], vehicle_type, max_payload_kg, current_lat, current_lon, home_warehouse_id [FK], status)
DISPATCH_SHIPMENTS (id [PK], tracking_code [UQ], request_id [FK], warehouse_id [FK], vehicle_id [FK], delivery_status)
DISPATCH_ITEMS (id [PK], shipment_id [FK], category_id [FK], quantity_loaded)
ALLOCATION_AUDIT_LOG (id [PK], entity_name, entity_id, action_type, old_state, new_state, timestamp)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
