use std::cell::{RefCell, RefMut};
use std::rc::Rc;

use wasm_bindgen::prelude::*;

use mycelial_crdt::list;
use mycelial_crdt::vclock;
use num::rational::Ratio;
use num::BigInt;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(_: &str);
}

#[wasm_bindgen(start)]
pub fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

/// Aggregation state
///
/// Helps to aggregate data from on_update / on_apply hooks
struct AggregateState<T> {
    /// Indicates if apply happened during aggregation
    apply: bool,
    /// Accumulates operations over list
    ops: Vec<list::Op<T>>,
}

impl<T: Clone> AggregateState<T> {
    fn new() -> Self {
        Self {
            apply: false,
            ops: vec![],
        }
    }

    fn get_mut(this: &Rc<RefCell<Self>>) -> RefMut<'_, Self> {
        this.as_ref().borrow_mut()
    }

    fn push_op(&mut self, op: &list::Op<T>) {
        self.ops.push(op.clone());
    }

    fn get_ops(&self) -> &[list::Op<T>] {
        self.ops.as_slice()
    }

    fn clear_ops(&mut self) {
        self.ops.clear();
    }

    fn set_apply(&mut self) {
        self.apply = true
    }

    fn unset_apply(&mut self) {
        self.apply = false
    }
}

#[derive(Debug)]
pub enum ListError {
    /// Wraps original ListError
    ListError(list::ListError),

    /// Bad value from JS which could not be represented as a list::Value
    ValueError(String),

    /// Bad VClock passed to `diff` func
    VClockError(Option<String>),

    /// Bad diff passed to `apply` func
    DiffError(Option<String>),
}

impl std::fmt::Display for ListError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ListError::ListError(e) => write!(f, "{:?}", e),
            ListError::ValueError(e) => write!(f, "ValueError: {:?}", e),
            ListError::VClockError(e) => {
                let e = if e.is_some() {
                    format!(", error: {}", e.as_ref().unwrap())
                } else {
                    "".into()
                };
                write!(f, "VClockError: vclock should be json string{}", e)
            }
            ListError::DiffError(ref e) => {
                let e = if e.is_some() {
                    format!(", error: {}", e.as_ref().unwrap())
                } else {
                    "".into()
                };
                write!(f, "DiffError: diff should be json string{}", e)
            }
        }
    }
}
impl std::error::Error for ListError {}

macro_rules! impl_list {
    (@with_insert, $list_type:tt, $key_type:ty) => {
        impl_list!($list_type, $key_type);

        #[wasm_bindgen]
        impl $list_type {
            /// Insert values at given index
            pub fn insert(&mut self, index: usize, val: &JsValue) -> Result<(), JsError> {
                Ok(self
                    .inner
                    .insert(index, Self::jsvalue_to_value(val)?)
                    .map(|()| self.call_on_update())?)
            }
        }
    };

    ($list_type:tt, $key_type:ty) => {
        #[wasm_bindgen]
        pub struct $list_type {
            inner: list::$list_type,
            on_update: Option<js_sys::Function>,
            on_apply: Option<js_sys::Function>,
            aggregate_hooks: bool,
            aggregate_state: Rc<RefCell<AggregateState<$key_type>>>,
        }

        #[wasm_bindgen]
        impl $list_type {
            /// Create new instance of a List CRDT
            pub fn new(process: f64) -> Self {
                Self {
                    inner: list::$list_type::new(process as u64),
                    on_update: None,
                    on_apply: None,
                    aggregate_hooks: false,
                    aggregate_state: Rc::new(RefCell::new(AggregateState::new())),
                }
            }

            /// Set hook, which will be invoked on local list update
            pub fn set_on_update(&mut self, func: &js_sys::Function) {
                self.on_update = Some(func.clone());
                let state = Rc::clone(&self.aggregate_state);
                self.inner.set_on_update(Box::new(move |op| {
                    AggregateState::get_mut(&state).push_op(op)
                }));
            }

            /// Remove on update hook
            pub fn unset_on_update(&mut self) {
                self.on_update = None;
                self.inner.unset_on_update();
                AggregateState::get_mut(&self.aggregate_state).clear_ops();
            }

            /// Set hook, which will be invoked on remote update (apply)
            pub fn set_on_apply(&mut self, func: &js_sys::Function) {
                self.on_apply = Some(func.clone());
                let state = Rc::clone(&self.aggregate_state);
                self.inner.set_on_apply(Box::new(move || {
                    AggregateState::get_mut(&state).set_apply();
                }));
            }

            /// Unset on apply hook
            pub fn unset_on_apply(&mut self) {
                self.on_apply = None;
                self.inner.unset_on_apply();
                AggregateState::get_mut(&self.aggregate_state).unset_apply();
            }

            /// Append value to the end of the list
            pub fn append(&mut self, val: &JsValue) -> Result<(), JsError> {
                Ok(self
                    .inner
                    .append(Self::jsvalue_to_value(val)?)
                    .map(|()| self.call_on_update())?)
            }

            /// Insert value at head of the list
            pub fn prepend(&mut self, val: &JsValue) -> Result<(), JsError> {
                Ok(self
                    .inner
                    .prepend(Self::jsvalue_to_value(val)?)
                    .map(|()| self.call_on_update())?)
            }

            /// Delete value at given index
            pub fn delete(&mut self, index: usize) -> Result<(), JsError> {
                Ok(self.inner.delete(index).map(|_| self.call_on_update())?)
            }

            /// Apply Diff
            ///
            /// Passed diff expected to be JSON serialized vector of Operations
            pub fn apply(&mut self, diff: &JsValue) -> Result<(), JsError> {
                let s = match diff.as_string() {
                    Some(s) => s,
                    None => return Err(ListError::DiffError(None).into()),
                };
                let diff: Vec<list::Op<$key_type>> = match serde_json::from_str(&s) {
                    Ok(encoded) => encoded,
                    Err(e) => return Err(ListError::DiffError(Some(e.to_string())).into()),
                };
                Ok(self.inner.apply(&diff).map(|_| self.call_on_apply())?)
            }

            /// Dump stored values into vector
            pub fn to_vec(&self) -> Result<JsValue, JsError> {
                let arr = js_sys::Array::new();
                for value in self.inner.iter() {
                    arr.push(&Self::value_to_jsvalue(value)?);
                }
                Ok(arr.into())
            }

            /// Encode inner vclock into JSON
            pub fn vclock(&self) -> JsValue {
                serde_json::to_string(self.inner.vclock()).unwrap().into()
            }

            /// Calculate diff and encode into JSON
            ///
            /// Passed value is expected to be JSON serialized VClock
            pub fn diff(&self, value: &JsValue) -> Result<JsValue, JsError> {
                let value = match value.as_string() {
                    Some(s) => s,
                    None => return Err(ListError::VClockError(None).into()),
                };
                let vclock = match serde_json::from_str::<vclock::VClock>(&value) {
                    Ok(vclock) => vclock,
                    Err(e) => return Err(ListError::VClockError(Some(e.to_string())).into()),
                };
                let diff = self.inner.diff(&vclock);
                Ok(serde_json::to_string(&diff).unwrap().into())
            }

            /// Dump CRDT into serialized JSON
            pub fn dump(&self) -> Result<JsValue, JsError> {
                serde_json::to_string(&self.inner.diff(&vclock::VClock::new()))
                    .map(|s| s.into())
                    .map_err(|e| ListError::DiffError(Some(e.to_string())).into())
            }

            /// Set hooks aggregation into inner buffer, invoke hooks when unset
            #[wasm_bindgen(js_name=aggregateOps)]
            pub fn aggregate_ops(&mut self, aggregate: bool) {
                self.aggregate_hooks = aggregate;
                if !aggregate {
                    // if we switched from aggregation - call hooks immediately
                    self.call_on_update();
                    self.call_on_apply();
                }
            }

            fn call_on_update(&mut self) {
                if self.aggregate_hooks {
                    return;
                }
                let mut state = AggregateState::get_mut(&self.aggregate_state);
                let ops = state.get_ops();
                if ops.is_empty() {
                    return;
                }
                if let Some(ref hook) = self.on_update {
                    hook.call1(
                        &JsValue::null(),
                        &JsValue::from(serde_json::to_string(ops).unwrap()),
                    )
                    .unwrap();
                }
                state.clear_ops();
            }

            fn call_on_apply(&mut self) {
                if self.aggregate_hooks {
                    return;
                }
                let mut state = AggregateState::get_mut(&self.aggregate_state);
                if !state.apply {
                    return;
                }
                if let Some(ref hook) = self.on_apply {
                    hook.call0(&JsValue::null()).unwrap();
                };
                state.unset_apply();
            }

            fn jsvalue_to_value(value: &JsValue) -> Result<list::Value<$key_type>, ListError> {
                if let Some(s) = value.as_string() {
                    return Ok(list::Value::Str(s));
                }
                if let Some(f) = value.as_f64() {
                    return Ok(list::Value::Float(f));
                }
                if let Some(b) = value.as_bool() {
                    return Ok(list::Value::Bool(b));
                }

                // it's important to check whether the value is a *real* array
                // otherwise aliasing rules are broken, it's not clear why yet
                // broken aliasing rules makes list unusable
                // FIXME: find why it's happening
                // to replicate - remove this check, try to insert undefined
                if js_sys::Array::is_array(value) {
                    if let Ok(arr) = TryInto::<js_sys::Array>::try_into(value.clone()) {
                        let mut vec = vec![];
                        for val in arr.iter() {
                            vec.push(Self::jsvalue_to_value(&val)?)
                        }
                        return Ok(list::Value::Vec(vec));
                    }
                }
                Err(ListError::ValueError(format!(
                    "unsupported value of type '{}': {:?}",
                    value.js_typeof().as_string().unwrap(),
                    value
                )))
            }

            fn value_to_jsvalue(value: &list::Value<$key_type>) -> Result<JsValue, ListError> {
                match value {
                    list::Value::Str(s) => Ok(s.into()),
                    list::Value::Bool(b) => Ok((*b).into()),
                    list::Value::Float(f) => Ok((*f).into()),
                    list::Value::Vec(v) => {
                        let vec = v
                            .iter()
                            .map(Self::value_to_jsvalue)
                            .collect::<Result<Vec<JsValue>, ListError>>()?;
                        Ok(js_sys::Array::from_iter(vec.into_iter()).into())
                    }
                    list::Value::Empty | list::Value::Tombstone(_) => {
                        // Empty && Tombstone values are unreachable, `to_vec` operation filters them out
                        unreachable!()
                    }
                    other => Err(ListError::ValueError(format!("unsupported: {:?}", other))),
                }
            }
        }
    };
}

impl_list!(@with_insert, List, list::Key<Ratio<BigInt>>);
impl_list!(AppendOnlyList, list::Key<i64>);
