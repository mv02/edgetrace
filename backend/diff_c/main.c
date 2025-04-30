#include <stdbool.h>
#include <stdio.h>

#include "call_graph.h"
#include "method.h"

#define ALPHA 0.125
#define EPSILON 0.001

double level(method_t* m)
{
    if (m->equivalent != NULL && m->equivalent->is_reachable) {
        // The method is reachable in subgraph
        return 0;
    }
    // The method is absent from subgraph
    return m->value;
}

void diff(call_graph_t* sup, call_graph_t* sub, int max_iterations, int* i, bool* cancel_flag)
{
    double max = 1;

    call_graph_print(sup);
    call_graph_print(sub);
    printf("Purging unreachable edges\n");
    purge_unreachable_edges(sup);
    call_graph_print(sup);
    call_graph_print(sub);
    link_equivalents(sup, sub);
    printf("Purging common edges\n");
    purge_common_edges(sup);
    call_graph_print(sup);
    call_graph_print(sub);

    printf("Starting difference algorithm\n");
    while (max > EPSILON && *i < max_iterations && !*cancel_flag) {
        max = 0;

        for (edge_t* e = sup->edges; e != NULL; e = e->next) {
            double l2 = level(e->target);
            double l1 = level(e->source);

            if (l2 > max) {
                max = l2;
            }
            if (l1 > max) {
                max = l1;
            }

            double diff = ALPHA * (l2 - l1);

            if (diff > 0) {
                e->value += diff;
                e->target->value -= diff;
                e->source->value += diff;
            }
        }

        (*i)++;
        if (*i % 100 == 0 || *i == max_iterations || max <= EPSILON)
            printf("Iteration %d, max %g\n", *i, max);
    }
    printf("Done, %d iterations.\n", *i);
}

call_graph_t* diff_from_dirs(char* supergraph_directory, char* subgraph_directory,
                             int max_iterations, int* i, bool* cancel_flag)
{
    call_graph_t* sup = call_graph_create(supergraph_directory, "Supergraph");
    call_graph_t* sub = call_graph_create(subgraph_directory, "Subgraph");
    sup->other_graph = sub;
    sub->other_graph = sup;

    diff(sup, sub, max_iterations, i, cancel_flag);

    // Caller should destroy the graphs, return a pointer to one of them
    return sup;
}

int main(int argc, char* argv[])
{
    if (argc < 3) {
        printf("Usage: ./diff-tool DIR1 DIR2 [max_iterations] [top_n]\n");
        return 1;
    }

    int max_iterations = argc >= 4 ? atoi(argv[3]) : 1000;
    int iteration_count = 0;
    bool cancel_flag = false;
    call_graph_t* sup =
        diff_from_dirs(argv[1], argv[2], max_iterations, &iteration_count, &cancel_flag);

    int top_n = argc >= 5 ? atoi(argv[4]) : 10;
    if (top_n == 0) {
        call_graph_destroy(sup);
        return 0;
    }

    printf("\nTop %d edges:\n", top_n);
    print_top_edges(sup, top_n);
    call_graph_destroy(sup->other_graph);
    call_graph_destroy(sup);
}
