/**
 * File: backend/app/diff_c/csv.h
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Declares functions for loading methods, invokes, and call targets from CSV reports.
 */

#ifndef CSV_H
#define CSV_H

#include "hashtable.h"
#include "invoke.h"
#include "map.h"
#include "method.h"

void csv_load_methods(char* dirname, ht** methods, method_map_t* methods_by_id);
void csv_load_invokes(char* dirname, invoke_t** invokes, method_map_t* methods_by_id,
                      invoke_map_t* invokes_by_id);
void csv_load_targets(char* dirname, method_map_t* methods_by_id, invoke_map_t* invokes_by_id);

void csv_save_methods(char* dirname, ht* methods);

#endif
